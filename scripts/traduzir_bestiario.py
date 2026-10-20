#!/usr/bin/env python3
"""Gera um acervo PT-BR estático. Nada é traduzido no navegador do Mestre.

Fonte: D&D SRD 5.2.1, © Wizards of the Coast LLC, CC BY 4.0;
dataset estruturado Open5e/adkinn, igualmente CC BY 4.0.
A tradução automática offline exige revisão humana antes de uso em regras críticas.
"""
from __future__ import annotations
import json
import pathlib
import re
import sys
from copy import deepcopy
from functools import lru_cache

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "monsters.json"
NAMES = ROOT / "data" / "nomes-pt-BR.json"
DEST = ROOT / "data" / "monsters.pt-BR.json"
AUDIT = ROOT / "data" / "auditoria-pt-BR.json"

ACTIONS = {
    "Multiattack":"Ataque Múltiplo","Bite":"Mordida","Bites":"Mordidas",
    "Claw":"Garra","Claws":"Garras","Tail":"Cauda","Slam":"Pancada",
    "Magic Resistance":"Resistência à Magia","Amphibious":"Anfíbio",
    "Frightful Presence":"Presença Aterradora","Keen Smell":"Faro Aguçado",
    "Pack Tactics":"Táticas de Matilha","False Appearance":"Aparência Falsa",
    "Keen Hearing and Smell":"Audição e Faro Aguçados","Hooves":"Cascos",
    "Charge":"Investida","Beak":"Bico","Spider Climb":"Escalada Aracnídea",
    "Spellcasting":"Conjuração","Innate Spellcasting":"Conjuração Inata",
    "Magic Weapons":"Armas Mágicas","Change Shape":"Alterar Forma",
    "Shapechanger":"Metamorfo","Longsword":"Espada Longa",
    "Water Breathing":"Respiração Aquática","Shortsword":"Espada Curta",
    "Rock":"Rocha","Talons":"Garras","Devil's Sight":"Visão Diabólica",
    "Hold Breath":"Prender a Respiração","Longbow":"Arco Longo",
    "Keen Sight":"Visão Aguçada","Web Walker":"Caminhante de Teias",
    "Spear":"Lança","Sunlight Sensitivity":"Sensibilidade à Luz Solar",
    "Gore":"Chifrada","Ram":"Cabeçada","Scimitar":"Cimitarra",
    "Dagger":"Adaga","Parry":"Aparar","Echolocation":"Ecolocalização",
    "Fist":"Punho","Blood Frenzy":"Frenesi de Sangue","Sting":"Ferrão",
    "Web Sense":"Sentido das Teias","Swallow":"Engolir",
    "Stone Camouflage":"Camuflagem Rochosa","Invisibility":"Invisibilidade",
    "Death Burst":"Explosão Mortal","Pseudopod":"Pseudópode",
    "Javelin":"Azagaia","Greataxe":"Machado Grande",
    "Trampling Charge":"Investida Atropeladora",
    "Greatsword":"Espada Grande","Regeneration":"Regeneração",
    "Keen Hearing":"Audição Aguçada","Club":"Clava",
    "Standing Leap":"Salto Parado","Illumination":"Iluminação",
    "Tentacles":"Tentáculos","Constrict":"Constrição","Shortbow":"Arco Curto",
    "Pounce":"Bote","Amorphous":"Amorfo","Mace":"Maça",
    "Poison Breath":"Sopro Venenoso","Cold Breath":"Sopro Gélido",
    "Fire Breath":"Sopro de Fogo","Lightning Breath":"Sopro Elétrico",
    "Breath Weapons":"Armas de Sopro","Legendary Resistance":"Resistência Lendária",
    "Melee Weapon Attack":"Ataque Corpo a Corpo com Arma",
    "Ranged Weapon Attack":"Ataque à Distância com Arma",
}
DAMAGE = {
    "slashing":"cortante","piercing":"perfurante","bludgeoning":"contundente",
    "cold":"gélido","fire":"ígneo","lightning":"elétrico","thunder":"trovejante",
    "force":"energético","acid":"ácido","poison":"venenoso","necrotic":"necrótico",
    "radiant":"radiante","psychic":"psíquico","nonmagical":"não mágico",
}
TERMS = {
    "Common":"Comum","Draconic":"Dracônico","Abyssal":"Abissal",
    "Celestial":"Celestial","Deep Speech":"Dialeto Subterrâneo",
    "Dwarvish":"Anão","Elvish":"Élfico","Giant":"Gigante",
    "Goblin":"Goblin","Infernal":"Infernal","Primordial":"Primordial",
    "Sylvan":"Silvestre","Undercommon":"Subcomum","Terran":"Terrano",
    "Aquan":"Aquan","Auran":"Auran","Ignan":"Ignan",
    "charmed":"enfeitiçado","frightened":"amedrontado",
    "poisoned":"envenenado","grappled":"agarrado","restrained":"contido",
    "paralyzed":"paralisado","petrified":"petrificado","prone":"caído",
    "stunned":"atordoado","unconscious":"inconsciente","exhaustion":"exaustão",
    "blinded":"cego","deafened":"ensurdecido","incapacitated":"incapacitado",
}
DISTANCE = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:foot|feet|ft\.)\b", re.I)
DICE = re.compile(r"\b\d+d\d+\b", re.I)
ISSUES = []
CACHE = {}

def setup():
    import argostranslate.package as package
    import argostranslate.translate as translate
    package.update_package_index()
    packages = package.get_available_packages()
    en_pt = next((x for x in packages if x.from_code == "en" and x.to_code == "pt"), None)
    if en_pt is None:
        raise RuntimeError("Modelo offline Inglês → Português indisponível")
    installed = translate.get_installed_languages()
    if not any(x.code == "en" for x in installed) or not any(x.code == "pt" for x in installed):
        package.install_from_path(en_pt.download())
    return translate

def meters(match):
    feet = float(match.group(1))
    num = round(feet * 0.3, 2)
    return ("%g" % num).replace(".", ",") + " metros"

def prepare(text):
    text = DISTANCE.sub(meters, text)
    return text

def tidy(text):
    replacements = [
        (r"\bDC\s*(\d+)\b", r"CD \1"),
        (r"\bDC:\s*(\d+)\b", r"CD: \1"),
        (r"\bSalvamento\b", "Teste de Resistência"),
        (r"\bclasse de dificuldade\b", "Classe de Dificuldade"),
        (r"\bAção de Bônus\b", "Ação Bônus"),
        (r"\bmetres\b", "metros"),
    ]
    for find, replace in replacements:
        text = re.sub(find, replace, text, flags=re.I)
    return text.strip()

def translate_text(text, translator):
    if not text or not text.strip(): return text
    if text in TERMS: return TERMS[text]
    if text in DAMAGE: return DAMAGE[text]
    if text in CACHE: return CACHE[text]
    original = text.strip()
    result = tidy(translator.translate(prepare(original)))
    if not result: raise RuntimeError("Tradução vazia: " + original[:90])
    orig_dice, result_dice = DICE.findall(original), DICE.findall(result)
    if sorted(x.lower() for x in orig_dice) != sorted(x.lower() for x in result_dice):
        ISSUES.append({"tipo":"fórmula_de_dados","original":original[:180],"traducao":result[:180]})
    if len(result) < len(original) * 0.30 and len(original)>70:
        ISSUES.append({"tipo":"possível_resumo","original":original[:180],"traducao":result[:180]})
    CACHE[text] = result
    return result

def translate_entry(entry, translator):
    out = deepcopy(entry)
    name = entry["name"]
    basic = re.match(r"^(.+?)\s*\((.+)\)$", name)
    if name in ACTIONS:
        out["name"] = ACTIONS[name]
    elif basic and basic.group(1) in ACTIONS:
        out["name"] = ACTIONS[basic.group(1)] + " (" + translate_text(basic.group(2), translator) + ")"
    else:
        out["name"] = translate_text(name, translator)
    out["description"] = translate_text(entry.get("description", ""), translator)
    return out

def generate():
    translator_module = setup()
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    names = json.loads(NAMES.read_text(encoding="utf-8"))
    result = deepcopy(source)
    translated = translator_module.get_installed_languages()
    src = next(x for x in translated if x.code=="en")
    target = next(x for x in translated if x.code=="pt")
    engine = src.get_translation(target)
    for index, mon in enumerate(result["monsters"], 1):
        en_name = mon["name"]
        mon["name_en"] = en_name
        mon["name"] = names.get(en_name) or translate_text(en_name, engine)
        sb = mon["stat_block_json"]
        for key in ("traits", "actions", "bonus_actions", "reactions"):
            if isinstance(sb.get(key), list):
                sb[key] = [translate_entry(item, engine) for item in sb[key]]
        legend = sb.get("legendary_actions")
        if isinstance(legend,dict):
            legend["description"]=translate_text(legend.get("description",""),engine)
            legend["actions"]=[translate_entry(item,engine) for item in legend.get("actions",[])]
        for key in ("damage_vulnerabilities","damage_resistances","damage_immunities","condition_immunities","languages"):
            if isinstance(sb.get(key),list):
                sb[key] = [translate_text(item, engine) for item in sb[key]]
        mon["locale"]="pt-BR"
        if index%25 == 0:
            print(f"{index}/{len(result['monsters'])} criaturas preparadas em PT-BR", flush=True)
    result["_locale"]="pt-BR"
    result["_translation_notice"]=("Tradução automática offline para português brasileiro, "
        "gerada e armazenada previamente no repositório. Revisão editorial em andamento; "
        "as fórmulas, CDs e habilidades devem ser conferidas na fonte SRD 5.2.1.")
    result["_license"] = source["_license"]
    DEST.write_text(json.dumps(result,ensure_ascii=False,indent=None,separators=(',',':')),encoding="utf-8")
    AUDIT.write_text(json.dumps({"locale":"pt-BR","monstros":len(result["monsters"]),
      "campos_traduzidos_distintos":len(CACHE),"avisos":ISSUES},ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Tradução estática concluída: {len(result['monsters'])} monstros, "
          f"{len(CACHE)} trechos distintos, {len(ISSUES)} alertas.",flush=True)

if __name__=="__main__":
    generate()

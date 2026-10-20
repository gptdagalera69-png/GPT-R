// Sincronização opt-in do mestre. Usa somente chave PUBLICÁVEL Supabase + JWT do usuário e RLS.
const CONFIG_KEY='cm-cloud-config',AUTH_KEY='cm-cloud-session',LAST_KEY='cm-cloud-last';
let config=null,session=null,ctx=null,timer=null,remoteTime=null,saving=false,queued=null,dirty=false,lastSync='';
const getSaved=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
config=getSaved(CONFIG_KEY);session=getSaved(AUTH_KEY);remoteTime=localStorage.getItem(LAST_KEY);
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function configured(){return !!(config?.url&&config?.key)}
function logged(){return !!(configured()&&session?.access_token&&session?.user?.id)}
function prefix(){return String(config.url).replace(/\/+$/,'')}
function updateStatus(){const light=document.getElementById('connectionLight'),title=document.getElementById('connectionText'),subtitle=document.getElementById('connectionHint');if(!light)return;light.classList.toggle('online',logged());title.textContent=logged()?'Sincronização ativa':'Salvo neste dispositivo';subtitle.textContent=logged()?(saving?'Enviando alterações...':(lastSync?'Atualizado às '+lastSync:'Nuvem conectada')):configured()?'Conecte sua conta para sincronizar':'Configure a nuvem em Ajustes'}
export function cloudStatus(){updateStatus()}
export function cloudForm(){return `<p class="caption">Conecte a conta Supabase e entre com seu e-mail. Sem configuração, tudo continuará salvo neste dispositivo.</p><form id="cloudForm" data-intent="config"><label class="form-label">URL do projeto Supabase</label><input class="field wide" type="url" name="url" placeholder="https://seu-projeto.supabase.co" value="${html(config?.url||'')}"><label class="form-label">Chave publicável (sb_publishable... ou anon)</label><input class="field wide" name="key" type="text" autocomplete="off" placeholder="Cole somente a chave PUBLICÁVEL" value="${html(config?.key||'')}"><div class="actions" style="margin-top:12px"><button type="submit" data-cloud-action="config" class="btn sm">Salvar configuração</button><button type="submit" data-cloud-action="disconnect" class="btn sm danger">Desvincular</button></div><div class="hr"></div><label class="form-label">E-mail</label><input class="field wide" type="email" name="email" placeholder="voce@exemplo.com" autocomplete="email"><label class="form-label">Senha</label><input class="field wide" type="password" name="password" placeholder="••••••••" autocomplete="current-password"><div class="actions" style="margin-top:14px"><button type="submit" data-cloud-action="login" class="btn gold" ${!configured()?'disabled':''}>Entrar</button><button type="submit" data-cloud-action="signup" class="btn" ${!configured()?'disabled':''}>Criar conta</button>${logged()?'<button type="submit" data-cloud-action="logout" class="btn danger">Sair</button>':''}</div><div class="hr"></div><div class="notice info">Estado: ${logged()?'Conectado como '+html(session.user.email||'usuário'):'Ainda não conectado à nuvem'}. ${lastSync?'Última sincronização: '+html(lastSync):''}</div><div class="actions"><button type="submit" data-cloud-action="sync" class="btn outline" ${!logged()?'disabled':''}>↻ Sincronizar agora</button></div></form>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cloud-action]');if(b&&b.form)b.form.dataset.intent=b.dataset.cloudAction});
async function api(path,method='GET',body=null,auth=true,addHeaders={}){if(!configured())throw Error('Configuração da nuvem ausente.');let headers={'apikey':config.key,'Content-Type':'application/json',...addHeaders};if(auth&&session?.access_token)headers.Authorization='Bearer '+session.access_token;let result=await fetch(prefix()+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});let raw=await result.text(),data=null;try{data=raw?JSON.parse(raw):null}catch{data={message:raw}}if(!result.ok)throw Error(data?.msg||data?.message||data?.error_description||data?.error||('Erro HTTP '+result.status));return data}
async function refresh(){if(!session?.refresh_token)return false;if(Number(session.expires_at||0)>Date.now()/1000+90)return true;try{const data=await api('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false);session={...data,expires_at:Math.floor(Date.now()/1000)+data.expires_in};localStorage.setItem(AUTH_KEY,JSON.stringify(session));return true}catch{session=null;localStorage.removeItem(AUTH_KEY);updateStatus();return false}}
async function saveRemote(current){if(!logged()||!current)return;const alive=await refresh();if(!alive)return;const now=new Date().toISOString();const item={owner_id:session.user.id,data:current,updated_at:now};await api('/rest/v1/dm_workspace?on_conflict=owner_id','POST',[item],true,{'Prefer':'resolution=merge-duplicates,return=representation'});remoteTime=now;localStorage.setItem(LAST_KEY,remoteTime);lastSync=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});dirty=false;updateStatus()}
async function drain(){if(saving||!logged()||!queued)return;saving=true;updateStatus();const snapshot=queued;queued=null;try{await saveRemote(snapshot)}catch(err){dirty=true;queued=snapshot;ctx?.toast?.('Nuvem: '+err.message+'. Dados continuam salvos localmente.',true)}finally{saving=false;updateStatus()}if(queued)timer=setTimeout(drain,1700)}
export function queueCloudSave(s){dirty=true;queued=structuredClone(s);if(logged()){clearTimeout(timer);timer=setTimeout(drain,1200)}}
async function readRemote(showPrompt=true){
  if(!logged())return;
  await refresh();
  const rows=await api('/rest/v1/dm_workspace?select=data,updated_at&owner_id=eq.'+encodeURIComponent(session.user.id));
  const row=rows?.[0];
  if(!row){await saveRemote(ctx.saveState());return}
  const changed=!remoteTime||Date.parse(row.updated_at)>Date.parse(remoteTime)+300;
  if(changed&&!dirty){
    if(!remoteTime&&showPrompt){
      if(confirm('Existe um backup no Supabase. Carregar os dados da nuvem e substituir os dados deste dispositivo? Cancelar mantém os dados locais e envia-os à nuvem.')){
        ctx.overwriteState(row.data);ctx.toast('Dados carregados da nuvem');
      }else{await saveRemote(ctx.saveState());return}
    }else{
      ctx.overwriteState(row.data);
      ctx.toast('Seu combate foi atualizado pela nuvem');
    }
    remoteTime=row.updated_at;
    localStorage.setItem(LAST_KEY,remoteTime);
  }else if(!dirty){
    remoteTime=row.updated_at;
    localStorage.setItem(LAST_KEY,remoteTime);
  }
  lastSync=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  updateStatus();
}
export async function initializeCloud(c){ctx=c;if(logged()){await refresh();try{await readRemote(false)}catch(e){ctx.toast('Não foi possível receber dados da nuvem: '+e.message,true)} }updateStatus();setInterval(async()=>{if(document.visibilityState==='visible'&&logged()&&!dirty&&!saving){try{await readRemote(false)}catch{}}},18000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&logged()&&!dirty)readRemote(false).catch(()=>{})})}
export async function handleCloudAction(form,data,c){ctx=c;const intent=form.dataset.intent||'config';form.dataset.intent='config';try{
if(intent==='config'){const url=String(data.get('url')||'').trim().replace(/\/+$/,'');const key=String(data.get('key')||'').trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))throw Error('Use uma URL válida https://PROJETO.supabase.co');if(!key||!(/^(sb_publishable_|eyJ)/.test(key)))throw Error('Informe somente uma chave publicável/anon, nunca service_role.');config={url,key};localStorage.setItem(CONFIG_KEY,JSON.stringify(config));ctx.toast('Configuração salva. Entre na sua conta para sincronizar.');ctx.render();return}
if(intent==='disconnect'){if(!confirm('Desvincular a nuvem deste navegador? Os dados locais não serão apagados.'))return;config=null;session=null;remoteTime=null;localStorage.removeItem(CONFIG_KEY);localStorage.removeItem(AUTH_KEY);localStorage.removeItem(LAST_KEY);ctx.render();ctx.toast('Nuvem desvinculada');return}
if(intent==='logout'){session=null;localStorage.removeItem(AUTH_KEY);ctx.render();ctx.toast('Sessão encerrada');return}
if(intent==='login'||intent==='signup'){if(!configured())throw Error('Configure primeiro a URL e a chave publicável.');const email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');if(!email||!password)throw Error('Informe e-mail e senha');const path=intent==='login'?'/auth/v1/token?grant_type=password':'/auth/v1/signup';const result=await api(path,'POST',{email,password},false);if(!result.access_token){ctx.toast('Cadastro recebido. Confirme seu e-mail se o Supabase solicitar e depois faça login.');return}session={...result,expires_at:Math.floor(Date.now()/1000)+result.expires_in};localStorage.setItem(AUTH_KEY,JSON.stringify(session));remoteTime=null;localStorage.removeItem(LAST_KEY);await readRemote(true);ctx.render();ctx.toast('Conectado ao Supabase');return}
if(intent==='sync'){if(!logged())throw Error('Faça login primeiro');if(dirty){queued=structuredClone(ctx.saveState());await drain()}else await readRemote(false);ctx.render();ctx.toast('Sincronização conferida');return}
}catch(e){ctx.toast('Supabase: '+e.message,true);updateStatus()}}

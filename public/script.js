const $ = (id) => document.getElementById(id);
const input = $("promptInput"), messagesEl = $("messages"), welcome = $("welcome");
let conversations = JSON.parse(localStorage.getItem("noox_conversations") || "[]");
let currentId = null, attachments = [], busy = false, recognition = null;

function save(){ localStorage.setItem("noox_conversations", JSON.stringify(conversations)); renderHistory(); }
function current(){ return conversations.find(c=>c.id===currentId); }
function newConversation(){
  currentId = crypto.randomUUID();
  conversations.unshift({id:currentId,title:"Nova conversa",messages:[],updated:Date.now()});
  save(); renderMessages(); input.focus();
}
function renderHistory(){
  $("history").innerHTML="";
  conversations.forEach(c=>{
    const b=document.createElement("button"); b.className="history-item"+(c.id===currentId?" active":"");
    b.textContent="▱  "+c.title; b.title=c.title;
    b.onclick=()=>{currentId=c.id;renderMessages();renderHistory();closeSidebar();};
    $("history").appendChild(b);
  });
}
function renderMessages(){
  const c=current(); const has=c&&c.messages.length;
  welcome.style.display=has?"none":"block"; messagesEl.style.display=has?"block":"none"; messagesEl.innerHTML="";
  if(!has)return;
  c.messages.forEach(m=>addMessage(m.role,m.content,false));
  scrollBottom();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function formatText(s){
  let out=escapeHtml(s);
  out=out.replace(/```([\w-]*)\n?([\s\S]*?)```/g,(_,lang,code)=>`<pre><code>${code.trim()}</code></pre>`);
  out=out.replace(/`([^`]+)`/g,"<code>$1</code>");
  out=out.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>");
  out=out.replace(/\n/g,"<br>");
  return out;
}
function addMessage(role,content,scroll=true){
  welcome.style.display="none"; messagesEl.style.display="block";
  const row=document.createElement("div");row.className="message "+role;
  const avatar=document.createElement("div");avatar.className="msg-avatar";avatar.textContent=role==="user"?"V":"N";
  const bubble=document.createElement("div");bubble.className="bubble";
  if(typeof content==="string") bubble.innerHTML=formatText(content);
  else {
    const textPart=content.find(p=>p.type==="text")?.text||"";
    bubble.innerHTML=formatText(textPart);
    content.filter(p=>p.type==="image_url").forEach(p=>{const img=document.createElement("img");img.src=p.image_url.url;bubble.appendChild(img);});
  }
  row.append(avatar,bubble);messagesEl.appendChild(row);if(scroll)scrollBottom();return bubble;
}
function scrollBottom(){ $("chatArea").scrollTop=$("chatArea").scrollHeight; }
function setBusy(v){busy=v;$("sendBtn").disabled=v;$("sendBtn").innerHTML=v?"…":"<span>↑</span>";}
function titleFrom(text){return (text||"Nova conversa").replace(/\s+/g," ").slice(0, 34);}
function fileText(file){
  return new Promise((resolve,reject)=>{
    const ext=file.name.split(".").pop().toLowerCase();
    if(file.size>8*1024*1024)return reject(new Error("Arquivo maior que 8 MB: "+file.name));
    if(file.type.startsWith("image/")){const r=new FileReader();r.onload=()=>resolve({kind:"image",name:file.name,data:r.result});r.onerror=reject;r.readAsDataURL(file);return;}
    if(["txt","md","csv","json"].includes(ext)){const r=new FileReader();r.onload=()=>resolve({kind:"text",name:file.name,text:String(r.result).slice(0,18000)});r.onerror=reject;r.readAsText(file);return;}
    if(ext==="pdf"&&window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";const r=new FileReader();r.onload=async()=>{try{const pdf=await pdfjsLib.getDocument({data:new Uint8Array(r.result)}).promise;let text="";for(let i=1;i<=Math.min(pdf.numPages,20);i++){const page=await pdf.getPage(i);const tc=await page.getTextContent();text+=tc.items.map(x=>x.str).join(" ")+"\n";}resolve({kind:"text",name:file.name,text:text.slice(0,18000)});}catch(e){reject(e);}};r.onerror=reject;r.readAsArrayBuffer(file);return;}
    if(ext==="docx"&&window.mammoth){const r=new FileReader();r.onload=async()=>{try{const x=await mammoth.extractRawText({arrayBuffer:r.result});resolve({kind:"text",name:file.name,text:x.value.slice(0,18000)});}catch(e){reject(e);}};r.onerror=reject;r.readAsArrayBuffer(file);return;}
    reject(new Error("Formato não suportado: "+file.name));
  });
}
function renderAttachments(){
  $("attachmentPreview").innerHTML="";
  attachments.forEach((a,i)=>{const chip=document.createElement("div");chip.className="attachment-chip";chip.innerHTML=`<span>${a.kind==="image"?"▧":"▤"} ${escapeHtml(a.name)}</span><button aria-label="Remover">×</button>`;chip.querySelector("button").onclick=()=>{attachments.splice(i,1);renderAttachments();};$("attachmentPreview").appendChild(chip);});
}
$("attachBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=async e=>{
  for(const f of [...e.target.files]){try{attachments.push(await fileText(f));}catch(err){alert(err.message);}}
  renderAttachments();e.target.value="";
};
async function send(){
  const text=input.value.trim();if((!text&&!attachments.length)||busy)return;
  if(!current())newConversation();
  const c=current();let contentParts=[];
  if(text)contentParts.push({type:"text",text});
  attachments.forEach(a=>contentParts.push(a.kind==="image"?{type:"image_url",image_url:{url:a.data}}:{type:"text",text:`\n\n[Conteúdo do arquivo ${a.name}]\n${a.text}`}));
  const userContent=contentParts.length===1&&contentParts[0].type==="text"?contentParts[0].text:contentParts;
  c.messages.push({role:"user",content:userContent});c.updated=Date.now();
  if(c.messages.length===1)c.title=titleFrom(text||attachments[0]?.name);
  addMessage("user",userContent);save();input.value="";input.style.height="auto";attachments=[];renderAttachments();setBusy(true);
  const loading=addMessage("assistant","");loading.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';
  try{
    const history=c.messages.slice(-20).map(m=>({role:m.role,content:m.content}));
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Falha ao consultar a IA.");
    c.messages.push({role:"assistant",content:data.answer});loading.innerHTML=formatText(data.answer);c.updated=Date.now();save();
  }catch(err){loading.textContent="Não consegui responder: "+err.message;}
  finally{setBusy(false);scrollBottom();}
}
$("sendBtn").onclick=send;
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,150)+"px";});
$("newChat").onclick=newConversation;
$("clearChat").onclick=()=>{if(current()){current().messages=[];save();renderMessages();}};
document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;send();});
$("menuBtn").onclick=()=>{$("sidebar").classList.add("open");$("mobileShade").classList.add("show");};
$("mobileShade").onclick=closeSidebar;
function closeSidebar(){$("sidebar").classList.remove("open");$("mobileShade").classList.remove("show");}

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
  recognition=new SpeechRecognition();recognition.lang="pt-BR";recognition.interimResults=true;
  recognition.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;input.value=t;};
  recognition.onend=()=>$("micBtn").classList.remove("recording");
  $("micBtn").onclick=()=>{try{$("micBtn").classList.add("recording");recognition.start();}catch(e){$("micBtn").classList.remove("recording");}};
}else{$("micBtn").title="Reconhecimento de voz não suportado neste navegador";$("micBtn").onclick=()=>alert("Seu navegador não oferece reconhecimento de voz. Tente Chrome ou Edge.");}

async function init(){
  if(!conversations.length)newConversation();else{currentId=conversations[0].id;renderHistory();renderMessages();}
  try{const r=await fetch("/api/config");const d=await r.json();$("connectionText").textContent=d.configured?"Sistema pronto":"Configure a API";}catch{$("connectionText").textContent="Servidor indisponível";}
}
init();
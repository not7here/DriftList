(() => {
  'use strict';
  const STORAGE_KEY='driftlist-data-v1';
  const APPEARANCE_KEY='driftlist-appearance-v2';
  const LIST_COLORS=['teal','blue','violet','rose','orange','gold','green','slate'];
  const ACCENTS=['teal','blue','violet','rose','orange','green'];
  const DEFAULT_DATA={lists:[{id:crypto.randomUUID(),name:'Inbox',color:'teal',sort_order:0,updated_at:new Date().toISOString(),deleted_at:null}],tasks:[]};
  const $=selector=>document.querySelector(selector);
  const els={
    listTabs:$('#listTabs'),taskList:$('#taskList'),taskForm:$('#taskForm'),taskInput:$('#taskInput'),listTitle:$('#listTitle'),eyebrow:$('#eyebrow'),
    activeBtn:$('#activeViewButton'),doneBtn:$('#doneViewButton'),activeCount:$('#activeCount'),doneCount:$('#doneCount'),empty:$('#emptyState'),emptyTitle:$('#emptyTitle'),emptyText:$('#emptyText'),emptyAction:$('#emptyAction'),
    addList:$('#addListButton'),manageList:$('#manageListButton'),listModal:$('#listModal'),listForm:$('#listForm'),listName:$('#listName'),newListColors:$('#newListColors'),manageModal:$('#manageModal'),manageForm:$('#manageForm'),manageListName:$('#manageListName'),manageListColors:$('#manageListColors'),deleteList:$('#deleteListButton'),
    appearanceButton:$('#appearanceButton'),appearanceModal:$('#appearanceModal'),themeOptions:$('#themeOptions'),accentOptions:$('#accentOptions'),
    accountButton:$('#accountButton'),accountModal:$('#accountModal'),authForm:$('#authForm'),email:$('#emailInput'),password:$('#passwordInput'),authMessage:$('#authMessage'),signUp:$('#signUpButton'),signedInPanel:$('#signedInPanel'),signedInEmail:$('#signedInEmail'),signOut:$('#signOutButton'),syncPanel:$('#syncPanelButton'),localMode:$('#localModeMessage'),
    editModal:$('#editTaskModal'),editForm:$('#editTaskForm'),editInput:$('#editTaskInput'),priorityInput:$('#priorityInput'),moveTaskList:$('#moveTaskList'),reminderInput:$('#reminderInput'),clearReminder:$('#clearReminderButton'),reminderHelp:$('#reminderHelp'),deleteTask:$('#deleteTaskButton'),
    cloudStatus:$('#cloudStatus'),syncButton:$('#syncButton'),pinButton:$('#pinButton'),toast:$('#toast'),taskRegion:$('#taskRegion')
  };
  let data=migrateData(loadData());
  let selectedListId=data.lists.find(list=>!list.deleted_at)?.id;
  let view='active';
  let editingTaskId=null;
  let supabaseClient=null;
  let currentUser=null;
  let syncTimer=null;
  let toastTimer=null;
  let reminderTimer=null;
  let isPinned=false;
  let draggingTaskId=null;
  let appearance=loadAppearance();

  function loadData(){
    try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));if(parsed?.lists?.some(list=>!list.deleted_at))return parsed}catch(_error){}
    localStorage.setItem(STORAGE_KEY,JSON.stringify(DEFAULT_DATA));
    return structuredClone(DEFAULT_DATA);
  }
  function migrateData(source){
    source.lists=(source.lists||[]).map((list,index)=>({...list,color:LIST_COLORS.includes(list.color)?list.color:LIST_COLORS[index%LIST_COLORS.length]}));
    source.tasks=(source.tasks||[]).map(task=>({...task,priority:Boolean(task.priority),reminder_at:task.reminder_at||null,reminder_notified:Boolean(task.reminder_notified)}));
    return source;
  }
  function loadAppearance(){
    try{const saved=JSON.parse(localStorage.getItem(APPEARANCE_KEY));return {theme:['system','light','dark'].includes(saved?.theme)?saved.theme:'system',accent:ACCENTS.includes(saved?.accent)?saved.accent:'teal'}}catch(_error){return {theme:'system',accent:'teal'}}
  }
  function persist({sync=true}={}){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));scheduleReminders();if(sync&&currentUser){clearTimeout(syncTimer);syncTimer=setTimeout(syncToCloud,500)}}
  function now(){return new Date().toISOString()}
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function activeLists(){return data.lists.filter(list=>!list.deleted_at)}
  function selectedList(){return activeLists().find(list=>list.id===selectedListId)||activeLists()[0]}
  function showToast(message){els.toast.textContent=message;els.toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.hidden=true,2800)}
  function setCloudStatus(mode,text){const dot=els.cloudStatus.querySelector('.status-dot');dot.className=`status-dot is-${mode}`;els.cloudStatus.querySelector('span:last-child').textContent=text}
  function visibleTasks(listId=selectedListId,status=view){return data.tasks.filter(task=>task.list_id===listId&&!task.deleted_at&&(status==='done'?task.completed:!task.completed)).sort(taskSort)}
  function taskSort(a,b){return (a.sort_order??0)-(b.sort_order??0)||new Date(b.updated_at)-new Date(a.updated_at)}
  function colorOptions(selected,name){return LIST_COLORS.map(color=>`<label class="color-choice" title="${color}"><input type="radio" name="${name}" value="${color}" ${color===selected?'checked':''}><span class="color-swatch color-${color}" aria-hidden="true"></span><span class="sr-only">${color}</span></label>`).join('')}
  function reminderText(task){if(!task.reminder_at)return '';const value=new Date(task.reminder_at);if(Number.isNaN(value.getTime()))return '';return value.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
  function render(){
    if(!activeLists().length){data.lists.push({...structuredClone(DEFAULT_DATA.lists[0]),id:crypto.randomUUID(),updated_at:now()});selectedListId=activeLists()[0].id;persist()}
    if(!activeLists().some(list=>list.id===selectedListId))selectedListId=activeLists()[0].id;
    const list=selectedList();
    els.listTabs.innerHTML=activeLists().sort((a,b)=>a.sort_order-b.sort_order).map(item=>`<button class="list-tab color-${item.color} ${item.id===selectedListId?'is-active':''}" style="--tab-color:var(--list-${item.color})" type="button" data-list-id="${item.id}" aria-current="${item.id===selectedListId?'page':'false'}"><span class="tab-dot" aria-hidden="true"></span>${escapeHtml(item.name)}</button>`).join('');
    els.listTitle.textContent=list.name;els.eyebrow.textContent=`${currentUser?'SYNCED':'PERSONAL'} LIST`;
    const all=data.tasks.filter(task=>task.list_id===selectedListId&&!task.deleted_at);
    const active=all.filter(task=>!task.completed);const done=all.filter(task=>task.completed);
    els.activeCount.textContent=active.length;els.doneCount.textContent=done.length;
    els.activeBtn.classList.toggle('is-active',view==='active');els.doneBtn.classList.toggle('is-active',view==='done');
    els.activeBtn.setAttribute('aria-selected',view==='active');els.doneBtn.setAttribute('aria-selected',view==='done');
    const tasks=visibleTasks();
    els.taskList.innerHTML=tasks.map(task=>{
      const reminder=reminderText(task);
      return `<li class="task-item ${task.completed?'is-done':''} ${task.priority?'is-priority':''}" data-task-id="${task.id}" draggable="true">
        <button class="drag-handle" type="button" aria-label="Drag to reorder ${escapeHtml(task.title)}" title="Drag to reorder"><svg viewBox="0 0 24 24"><circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg></button>
        <input class="task-check" type="checkbox" ${task.completed?'checked':''} aria-label="${task.completed?'Mark active':'Complete'}: ${escapeHtml(task.title)}">
        <div class="task-copy"><span class="task-title">${escapeHtml(task.title)}</span>${reminder?`<span class="task-reminder ${new Date(task.reminder_at)<new Date()?'is-overdue':''}"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>${escapeHtml(reminder)}</span>`:''}</div>
        <div class="task-actions"><button class="priority-button ${task.priority?'is-active':''}" type="button" aria-pressed="${task.priority}" aria-label="${task.priority?'Remove priority from':'Mark as priority'} ${escapeHtml(task.title)}" title="Priority"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/></svg></button><button class="task-menu" type="button" aria-label="Edit ${escapeHtml(task.title)}" title="Edit task"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button></div>
      </li>`;
    }).join('');
    els.empty.hidden=tasks.length>0;
    if(!tasks.length){const completed=view==='done';els.emptyTitle.textContent=completed?'Nothing completed yet':'A clear list';els.emptyText.textContent=completed?'Completed tasks will rest here until you need them again.':'Add one small thing above. You can check it off when it’s done.';els.emptyAction.textContent=completed?'Show active tasks':'Add a task'}
    updateAppearanceControls();
  }

  function addTask(title){const clean=title.trim();if(!clean)return;const order=visibleTasks(selectedListId,'active').length;data.tasks.push({id:crypto.randomUUID(),list_id:selectedListId,title:clean,completed:false,priority:false,reminder_at:null,reminder_notified:false,sort_order:order,created_at:now(),updated_at:now(),deleted_at:null});persist();render();els.taskInput.value=''}
  function toggleTask(id){const task=data.tasks.find(item=>item.id===id);if(!task)return;task.completed=!task.completed;task.sort_order=visibleTasks(task.list_id,task.completed?'done':'active').length;task.updated_at=now();persist();render();showToast(task.completed?'Task completed':'Task returned to active')}
  function togglePriority(id){const task=data.tasks.find(item=>item.id===id);if(!task)return;task.priority=!task.priority;task.updated_at=now();persist();render();showToast(task.priority?'Marked as priority':'Priority removed')}
  function softDeleteTask(id){const task=data.tasks.find(item=>item.id===id);if(!task)return;task.deleted_at=now();task.updated_at=now();persist();closeModals();render();showToast('Task deleted')}
  function normalizeOrder(listId,status){visibleTasks(listId,status).forEach((task,index)=>{task.sort_order=index;task.updated_at=now()})}
  function reorderTask(taskId,targetId,after=false){
    const task=data.tasks.find(item=>item.id===taskId);const target=data.tasks.find(item=>item.id===targetId);if(!task||!target||task.id===target.id)return;
    const oldList=task.list_id;const oldStatus=task.completed?'done':'active';task.list_id=target.list_id;task.completed=target.completed;
    let ordered=visibleTasks(target.list_id,target.completed?'done':'active').filter(item=>item.id!==task.id);let index=ordered.findIndex(item=>item.id===target.id);ordered.splice(index+(after?1:0),0,task);
    ordered.forEach((item,i)=>{item.sort_order=i;item.updated_at=now()});normalizeOrder(oldList,oldStatus);persist();selectedListId=target.list_id;view=target.completed?'done':'active';render()
  }
  function moveTaskToList(taskId,listId){const task=data.tasks.find(item=>item.id===taskId);if(!task||task.list_id===listId)return;const oldList=task.list_id;const status=task.completed?'done':'active';task.list_id=listId;task.sort_order=visibleTasks(listId,status).length;task.updated_at=now();normalizeOrder(oldList,status);persist();render();showToast(`Moved to ${activeLists().find(list=>list.id===listId)?.name||'list'}`)}
  function openTaskEditor(taskId){
    const task=data.tasks.find(item=>item.id===taskId);if(!task)return;editingTaskId=taskId;els.editInput.value=task.title;els.priorityInput.checked=task.priority;els.moveTaskList.innerHTML=activeLists().sort((a,b)=>a.sort_order-b.sort_order).map(list=>`<option value="${list.id}" ${list.id===task.list_id?'selected':''}>${escapeHtml(list.name)}</option>`).join('');els.reminderInput.value=toLocalInput(task.reminder_at);els.clearReminder.hidden=!task.reminder_at;updateReminderHelp();openModal(els.editModal,els.editInput)
  }
  function openModal(modal,focus){modal.hidden=false;requestAnimationFrame(()=>focus?.focus())}
  function closeModals(){document.querySelectorAll('.modal-backdrop').forEach(modal=>modal.hidden=true);editingTaskId=null}

  function applyAppearance(){
    const systemDark=matchMedia('(prefers-color-scheme:dark)').matches;const resolved=appearance.theme==='system'?(systemDark?'dark':'light'):appearance.theme;
    document.documentElement.dataset.theme=resolved;document.documentElement.dataset.accent=appearance.accent;document.querySelector('meta[name="theme-color"]').content=resolved==='dark'?'#171816':'#f7f6f2';localStorage.setItem(APPEARANCE_KEY,JSON.stringify(appearance));updateAppearanceControls()
  }
  function updateAppearanceControls(){if(!els.themeOptions)return;els.themeOptions.querySelectorAll('[data-theme-choice]').forEach(button=>{const active=button.dataset.themeChoice===appearance.theme;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',active)});els.accentOptions.querySelectorAll('input').forEach(input=>input.checked=input.value===appearance.accent)}
  function accentOptions(){return ACCENTS.map(color=>`<label class="color-choice color-choice-labelled"><input type="radio" name="accent" value="${color}" ${color===appearance.accent?'checked':''}><span class="color-swatch color-${color}"></span><span>${color[0].toUpperCase()+color.slice(1)}</span></label>`).join('')}

  function toLocalInput(value){if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
  function updateReminderHelp(){if(!('Notification'in window))els.reminderHelp.textContent='System notifications are unavailable here; in-app alerts still work.';else if(Notification.permission==='denied')els.reminderHelp.textContent='Notifications are blocked; in-app alerts still work.';else els.reminderHelp.textContent='The app must be open for reliable alerts.'}
  async function requestNotificationPermission(){if(!('Notification'in window)||Notification.permission!=='default')return;try{await Notification.requestPermission()}catch(_error){}updateReminderHelp()}
  function notifyTask(task){
    const list=activeLists().find(item=>item.id===task.list_id);const body=list?`${list.name}: ${task.title}`:task.title;
    if('Notification'in window&&Notification.permission==='granted'){try{new Notification('DriftList reminder',{body,icon:'./assets/icon-192.png',tag:`driftlist-${task.id}`})}catch(_error){showToast(`Reminder: ${task.title}`)}}else showToast(`Reminder: ${task.title}`);
    task.reminder_notified=true;task.updated_at=now();persist()
  }
  function checkReminders(){const stamp=Date.now();data.tasks.filter(task=>!task.deleted_at&&!task.completed&&task.reminder_at&&!task.reminder_notified&&new Date(task.reminder_at).getTime()<=stamp).forEach(notifyTask)}
  function scheduleReminders(){clearInterval(reminderTimer);checkReminders();reminderTimer=setInterval(checkReminders,30000)}

  els.taskForm.addEventListener('submit',event=>{event.preventDefault();addTask(els.taskInput.value)});
  els.listTabs.addEventListener('click',event=>{const button=event.target.closest('[data-list-id]');if(!button)return;selectedListId=button.dataset.listId;view='active';render()});
  els.listTabs.addEventListener('dragover',event=>{const tab=event.target.closest('[data-list-id]');if(!tab||!draggingTaskId)return;event.preventDefault();tab.classList.add('is-drop-target')});
  els.listTabs.addEventListener('dragleave',event=>event.target.closest('[data-list-id]')?.classList.remove('is-drop-target'));
  els.listTabs.addEventListener('drop',event=>{const tab=event.target.closest('[data-list-id]');if(!tab||!draggingTaskId)return;event.preventDefault();els.listTabs.querySelectorAll('.is-drop-target').forEach(item=>item.classList.remove('is-drop-target'));moveTaskToList(draggingTaskId,tab.dataset.listId);draggingTaskId=null});
  els.activeBtn.addEventListener('click',()=>{view='active';render()});els.doneBtn.addEventListener('click',()=>{view='done';render()});
  els.emptyAction.addEventListener('click',()=>{if(view==='done'){view='active';render()}else els.taskInput.focus()});
  els.taskList.addEventListener('change',event=>{const item=event.target.closest('[data-task-id]');if(item&&event.target.classList.contains('task-check'))toggleTask(item.dataset.taskId)});
  els.taskList.addEventListener('click',event=>{const item=event.target.closest('[data-task-id]');if(!item)return;if(event.target.closest('.priority-button'))togglePriority(item.dataset.taskId);else if(event.target.closest('.task-menu'))openTaskEditor(item.dataset.taskId)});
  els.taskList.addEventListener('dragstart',event=>{const item=event.target.closest('[data-task-id]');if(!item)return;draggingTaskId=item.dataset.taskId;item.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggingTaskId)});
  els.taskList.addEventListener('dragend',event=>{event.target.closest('[data-task-id]')?.classList.remove('is-dragging');document.querySelectorAll('.is-drop-target,.drop-before,.drop-after').forEach(item=>item.classList.remove('is-drop-target','drop-before','drop-after'));draggingTaskId=null});
  els.taskList.addEventListener('dragover',event=>{const item=event.target.closest('[data-task-id]');if(!item||!draggingTaskId||item.dataset.taskId===draggingTaskId)return;event.preventDefault();const after=event.clientY>item.getBoundingClientRect().top+item.offsetHeight/2;els.taskList.querySelectorAll('.drop-before,.drop-after').forEach(row=>row.classList.remove('drop-before','drop-after'));item.classList.add(after?'drop-after':'drop-before')});
  els.taskList.addEventListener('drop',event=>{const item=event.target.closest('[data-task-id]');if(!item||!draggingTaskId)return;event.preventDefault();const after=event.clientY>item.getBoundingClientRect().top+item.offsetHeight/2;reorderTask(draggingTaskId,item.dataset.taskId,after);draggingTaskId=null});

  els.newListColors.innerHTML=colorOptions('blue','new-list-color');els.manageListColors.innerHTML=colorOptions('teal','manage-list-color');els.accentOptions.innerHTML=accentOptions();
  els.addList.addEventListener('click',()=>{els.listName.value='';els.newListColors.innerHTML=colorOptions(LIST_COLORS[activeLists().length%LIST_COLORS.length],'new-list-color');openModal(els.listModal,els.listName)});
  els.listForm.addEventListener('submit',event=>{event.preventDefault();const name=els.listName.value.trim();if(!name)return;const color=els.newListColors.querySelector('input:checked')?.value||'teal';const list={id:crypto.randomUUID(),name,color,sort_order:activeLists().length,updated_at:now(),deleted_at:null};data.lists.push(list);selectedListId=list.id;persist();closeModals();render()});
  els.manageList.addEventListener('click',()=>{const list=selectedList();els.manageListName.value=list.name;els.manageListColors.innerHTML=colorOptions(list.color,'manage-list-color');openModal(els.manageModal,els.manageListName)});
  els.manageForm.addEventListener('submit',event=>{event.preventDefault();const list=selectedList();list.name=els.manageListName.value.trim()||list.name;list.color=els.manageListColors.querySelector('input:checked')?.value||list.color;list.updated_at=now();persist();closeModals();render()});
  els.deleteList.addEventListener('click',()=>{if(activeLists().length===1){showToast('Keep at least one list');return}const id=selectedListId;const stamp=now();const list=selectedList();list.deleted_at=stamp;list.updated_at=stamp;data.tasks.filter(task=>task.list_id===id).forEach(task=>{task.deleted_at=stamp;task.updated_at=stamp});selectedListId=activeLists()[0].id;persist();closeModals();render();showToast('List deleted')});

  els.appearanceButton.addEventListener('click',()=>openModal(els.appearanceModal,els.themeOptions.querySelector('.is-active')));
  els.themeOptions.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(!button)return;appearance.theme=button.dataset.themeChoice;applyAppearance()});
  els.accentOptions.addEventListener('change',event=>{if(event.target.name!=='accent')return;appearance.accent=event.target.value;applyAppearance()});
  matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(appearance.theme==='system')applyAppearance()});

  els.editForm.addEventListener('submit',async event=>{event.preventDefault();const task=data.tasks.find(item=>item.id===editingTaskId);if(!task)return;const oldList=task.list_id;task.title=els.editInput.value.trim();task.priority=els.priorityInput.checked;task.list_id=els.moveTaskList.value;const reminder=els.reminderInput.value?new Date(els.reminderInput.value).toISOString():null;if(reminder!==task.reminder_at){task.reminder_at=reminder;task.reminder_notified=false}if(task.list_id!==oldList){task.sort_order=visibleTasks(task.list_id,task.completed?'done':'active').length;normalizeOrder(oldList,task.completed?'done':'active')}task.updated_at=now();if(reminder)await requestNotificationPermission();persist();closeModals();render();showToast(task.list_id!==oldList?'Task moved and saved':'Task saved')});
  els.reminderInput.addEventListener('change',()=>{els.clearReminder.hidden=!els.reminderInput.value});
  els.clearReminder.addEventListener('click',()=>{els.reminderInput.value='';els.clearReminder.hidden=true});
  els.deleteTask.addEventListener('click',()=>softDeleteTask(editingTaskId));
  document.querySelectorAll('.modal-close,.modal-cancel').forEach(button=>button.addEventListener('click',closeModals));
  document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('mousedown',event=>{if(event.target===backdrop)closeModals()}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModals();if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='n'){event.preventDefault();els.taskInput.focus()}});

  els.pinButton.addEventListener('click',async()=>{if(!window.driftDesktop){showToast('Always-on-top is available in the Windows app');return}isPinned=await window.driftDesktop.setAlwaysOnTop(!isPinned);els.pinButton.classList.toggle('is-active',isPinned);showToast(isPinned?'Window pinned on top':'Window unpinned')});
  window.driftDesktop?.getAlwaysOnTop().then(value=>{isPinned=value;els.pinButton.classList.toggle('is-active',value)});

  function cloudConfigured(){const config=window.DRIFTLIST_CONFIG||{};return config.supabaseUrl&&!config.supabaseUrl.startsWith('YOUR_')&&config.supabaseAnonKey&&!config.supabaseAnonKey.startsWith('YOUR_')}
  async function initCloud(){if(!cloudConfigured()||!window.supabase){setCloudStatus('local','Saved on this device');return}supabaseClient=window.supabase.createClient(window.DRIFTLIST_CONFIG.supabaseUrl,window.DRIFTLIST_CONFIG.supabaseAnonKey);const {data:{session}}=await supabaseClient.auth.getSession();setUser(session?.user||null);supabaseClient.auth.onAuthStateChange((_event,session)=>{setUser(session?.user||null);if(session?.user)syncFromCloud()});if(currentUser)await syncFromCloud()}
  function setUser(user){currentUser=user;els.localMode.hidden=Boolean(supabaseClient);els.authForm.hidden=Boolean(user);els.signedInPanel.hidden=!user;if(user){els.signedInEmail.textContent=user.email;els.accountButton.textContent=user.email.slice(0,1).toUpperCase();setCloudStatus('online','Cloud sync on')}else{els.accountButton.textContent='C';setCloudStatus('local',supabaseClient?'Sign in to sync':'Saved on this device')}render()}
  async function handleAuth(mode){if(!supabaseClient){els.authMessage.textContent='Cloud sync is not configured yet. Open SETUP-GUIDE.md.';return}els.authMessage.textContent='Working…';const credentials={email:els.email.value.trim(),password:els.password.value};const result=mode==='signup'?await supabaseClient.auth.signUp(credentials):await supabaseClient.auth.signInWithPassword(credentials);if(result.error){els.authMessage.textContent=result.error.message;return}els.authMessage.textContent=mode==='signup'&&!result.data.session?'Check your email to confirm your account.':'Signed in.'}
  els.accountButton.addEventListener('click',()=>openModal(els.accountModal,currentUser?null:els.email));els.cloudStatus.addEventListener('click',()=>openModal(els.accountModal,currentUser?null:els.email));
  els.authForm.addEventListener('submit',event=>{event.preventDefault();handleAuth('signin')});els.signUp.addEventListener('click',()=>handleAuth('signup'));els.signOut.addEventListener('click',()=>supabaseClient?.auth.signOut());els.syncPanel.addEventListener('click',syncFromCloud);els.syncButton.addEventListener('click',()=>currentUser?syncFromCloud():openModal(els.accountModal,els.email));
  async function syncToCloud(){
    if(!supabaseClient||!currentUser)return;setCloudStatus('syncing','Syncing…');els.syncButton.classList.add('is-spinning');
    const lists=data.lists.map(list=>({...list,user_id:currentUser.id}));const tasks=data.tasks.map(task=>({...task,user_id:currentUser.id}));
    const listResult=await supabaseClient.from('lists').upsert(lists,{onConflict:'id'});const taskResult=tasks.length?await supabaseClient.from('tasks').upsert(tasks,{onConflict:'id'}):{error:null};
    els.syncButton.classList.remove('is-spinning');if(listResult.error||taskResult.error){setCloudStatus('error','Sync problem');showToast((listResult.error||taskResult.error).message);return}setCloudStatus('online','Synced just now')
  }
  function mergeByUpdatedAt(localRows,remoteRows){const merged=new Map();[...remoteRows,...localRows].forEach(row=>{const prior=merged.get(row.id);if(!prior||new Date(row.updated_at)>=new Date(prior.updated_at))merged.set(row.id,row)});return [...merged.values()]}
  async function syncFromCloud(){
    if(!supabaseClient||!currentUser)return;setCloudStatus('syncing','Syncing…');els.syncButton.classList.add('is-spinning');els.taskRegion.setAttribute('aria-busy','true');
    const [listResult,taskResult]=await Promise.all([supabaseClient.from('lists').select('*').order('sort_order'),supabaseClient.from('tasks').select('*')]);
    if(listResult.error||taskResult.error){els.syncButton.classList.remove('is-spinning');els.taskRegion.setAttribute('aria-busy','false');setCloudStatus('error','Sync problem');showToast((listResult.error||taskResult.error).message);return}
    const remoteLists=(listResult.data||[]).map(({user_id,...list})=>list);const remoteTasks=(taskResult.data||[]).map(({user_id,...task})=>task);data=migrateData({lists:mergeByUpdatedAt(data.lists,remoteLists),tasks:mergeByUpdatedAt(data.tasks,remoteTasks)});persist({sync:false});selectedListId=activeLists().some(list=>list.id===selectedListId)?selectedListId:activeLists()[0]?.id;render();await syncToCloud();els.taskRegion.setAttribute('aria-busy','false')
  }
  window.addEventListener('online',()=>currentUser&&syncFromCloud());window.addEventListener('focus',checkReminders);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders()});
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  applyAppearance();render();scheduleReminders();initCloud();
})();

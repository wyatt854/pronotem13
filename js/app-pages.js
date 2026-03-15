// ─────────────────────────────────────────────
// ══ PAGES ADMIN / MODO ══════════════════════
// ─────────────────────────────────────────────

// ── 12. DASHBOARD ADMIN ──────────────────────
registerPage('dashboard', async function() {
  var el=document.getElementById('page-dashboard');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Tableau de bord</span></div><div id="sg" class="dashboard-grid"></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px"><div id="ca"></div><div id="cn"></div><div id="cs"></div></div>';
  var t=today();
  var results = await Promise.all([
    supa.from('profiles').select('id',{count:'exact',head:true}).eq('role','acteur').eq('actif',true),
    supa.from('profiles').select('id',{count:'exact',head:true}).eq('role','moderateur').eq('actif',true),
    supa.from('classes').select('id',{count:'exact',head:true}).eq('actif',true),
    supa.from('absences').select('id',{count:'exact',head:true}).eq('date',t),
    supa.from('sanctions').select('id',{count:'exact',head:true}).eq('statut','en_attente'),
    supa.from('demandes_justification').select('id',{count:'exact',head:true}).eq('statut','en_attente'),
  ]);
  document.getElementById('sg').innerHTML =
    sc('🎓','#E3F2FD',results[0].count||0,'Acteurs')+
    sc('🎭','#E8F5E9',results[1].count||0,'Modérateurs')+
    sc('🏫','#FFF3E0',results[2].count||0,'Classes')+
    sc('📋','#FFEBEE',results[3].count||0,'Absences aujourd\'hui')+
    sc('⚠️','#F3E5F5',results[4].count||0,'Retenues à valider')+
    sc('✅','#E0F2F1',results[5].count||0,'Justif. en attente');

  var ra=await db.absences({date:t});
  document.getElementById('ca').innerHTML='<div class="card"><div class="card-header"><div class="card-title">📋 Absences du jour</div><a onclick="navigate(\'absences\')" style="font-size:12px;color:var(--bleu-pronote);cursor:pointer">Tout voir →</a></div><div class="table-container"><table><thead><tr><th>Élève</th><th>Type</th><th>Motif</th></tr></thead><tbody>'+(ra.data||[]).slice(0,6).map(function(a){return '<tr><td>'+(a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+'</td><td><span style="font-size:11px;background:'+(a.type==='absence'?'#C62828':'#E65100')+';color:white;padding:1px 6px;border-radius:8px">'+a.type+'</span></td><td>'+motifBadge(a.motif_code||a.motif)+'</td></tr>';}).join('')+'</tbody></table></div></div>';

  var rn=await db.notes();
  document.getElementById('cn').innerHTML='<div class="card"><div class="card-header"><div class="card-title">📝 Dernières notes</div></div><div class="table-container"><table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th></tr></thead><tbody>'+(rn.data||[]).slice(0,6).map(function(n){return '<tr><td>'+(n.profiles?n.profiles.prenom[0]+'. '+n.profiles.nom:'')+'</td><td style="font-size:12px">'+(n.matieres?n.matieres.nom:'')+'</td><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td></tr>';}).join('')+'</tbody></table></div></div>';

  var rs=await db.sanctions({statut:'en_attente'});
  document.getElementById('cs').innerHTML='<div class="card"><div class="card-header"><div class="card-title">⚠️ Retenues à valider</div><a onclick="navigate(\'sanctions\')" style="font-size:12px;color:var(--bleu-pronote);cursor:pointer">Tout voir →</a></div><div style="padding:0 4px">'+(rs.data||[]).slice(0,5).map(function(s){return '<div style="padding:10px;border-bottom:1px solid var(--gris-border)"><div style="font-weight:600;font-size:13px">'+(s.profiles?s.profiles.prenom+' '+s.profiles.nom:'')+' <span style="font-size:11px;background:#E65100;color:white;padding:1px 6px;border-radius:8px">'+s.type+'</span></div><div style="font-size:12px;color:#546E7A;margin:2px 0">'+( s.motif||'').substring(0,60)+'</div><div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-success btn-sm" onclick="validerSanction(\''+s.id+'\')">✅ Valider</button><button class="btn btn-danger btn-sm" onclick="refuserSanction(\''+s.id+'\')">❌ Refuser</button></div></div>';}).join('')+(!(rs.data||[]).length?'<div style="padding:16px;text-align:center;color:#90A4AE;font-size:13px">Aucune retenue en attente ✅</div>':'')+'</div></div>';
});

// ── 13. ABSENCES (admin) ─────────────────────
registerPage('absences', async function() {
  var el=document.getElementById('page-absences');
  el.innerHTML=
    '<div class="breadcrumb">M13 Studio <span>Absences / Retards</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">📋 Absences & Retards</div>'+
    '<div style="display:flex;gap:8px;align-items:center">'+
      '<input class="form-control" id="abs-date" type="date" value="'+today()+'" onchange="renderAbsences()" style="width:150px">'+
      '<select class="form-control" id="abs-type" onchange="renderAbsences()" style="width:120px"><option value="">Tous</option><option value="absence">Absence</option><option value="retard">Retard</option><option value="exclusion">Exclusion</option></select>'+
      '<button class="btn btn-primary btn-sm" onclick="modalSaisirAbsence()">+ Saisir</button>'+
    '</div></div><div id="abs-body"></div></div>';
  renderAbsences();
});

async function renderAbsences() {
  var d=g('abs-date')||today(), tf=g('abs-type');
  var r=await db.absences({date:d});
  var data=(r.data||[]);
  if(tf) data=data.filter(function(a){return a.type===tf;});
  var TC={absence:'#C62828',retard:'#E65100',exclusion:'#6A1B9A'};
  var rows=data.map(function(a){
    var tc=TC[a.type]||'#546E7A';
    var mc=a.motif_code||a.motif||null;
    return '<tr>'+
      '<td><strong>'+(a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+'</strong></td>'+
      '<td style="font-size:12px">'+(a.profiles&&a.profiles.classes?a.profiles.classes.nom:'-')+'</td>'+
      '<td><span style="background:'+tc+';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+a.type+'</span></td>'+
      '<td>'+motifBadge(mc)+'</td>'+
      '<td style="font-size:12px;color:#546E7A;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(a.commentaire||'-')+'</td>'+
      '<td><button class="btn btn-sm '+(a.justifiee?'btn-success':'btn-secondary')+'" onclick="toggleJustif(\''+a.id+'\','+ (!a.justifiee)+')" title="'+(a.justifiee?'Justifiée':'Non justifiée')+'">'+(a.justifiee?'✅':'❌')+'</button></td>'+
      '<td>'+
        '<button class="btn btn-secondary btn-sm" onclick="modalModifAbsence(\''+a.id+'\')">✏️</button> '+
        '<button class="btn btn-danger btn-sm" onclick="delAbsence(\''+a.id+'\')">🗑️</button>'+
      '</td>'+
    '</tr>';
  }).join('');
  document.getElementById('abs-body').innerHTML=rows.length?
    '<div class="table-container"><table><thead><tr><th>Élève</th><th>Classe</th><th>Type</th><th>Motif officiel</th><th>Commentaire</th><th>Justif.</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>':
    '<div style="padding:24px;text-align:center;color:#90A4AE">Aucune absence pour ces filtres.</div>';
}

async function modalSaisirAbsence() {
  var re=await db.profiles({role:'acteur',actif:true});
  setModal('➕ Saisir une absence',
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="absence">Absence</option><option value="retard">Retard</option><option value="exclusion">Exclusion</option></select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hd" type="time"></div><div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hf" type="time"></div></div>'+
    '<div class="form-group"><label class="form-label">Motif officiel</label>'+motifSelect('')+'</div>'+
    '<div class="form-group"><label class="form-label">Commentaire libre</label><textarea class="form-control" id="f-commentaire" rows="2" placeholder="Informations complémentaires…"></textarea></div>'+
    '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f-justif"><label for="f-justif" class="form-label" style="margin:0">Justifiée</label></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="sauvegarderAbsence()">Enregistrer</button>'
  );
}

async function sauvegarderAbsence() {
  var eid=g('f-eleve'),d=g('f-date');
  if(!eid||!d){showToast('Champs obligatoires','warning');return;}
  var mc=g('f-motif-code')||null;
  var r=await supa.from('absences').insert({
    eleve_id:eid,date:d,type:g('f-type'),
    heure_debut:g('f-hd')||null,heure_fin:g('f-hf')||null,
    motif:mc,motif_code:mc,
    commentaire:document.getElementById('f-commentaire').value||null,
    justifiee:document.getElementById('f-justif').checked,
    saisie_par:currentUser.id
  });
  if(r.error){showToast(r.error.message,'danger');return;}
  // Notifier l'élève
  await creerNotif(eid,'absence','📋 Nouvelle absence enregistrée','Une '+g('f-type')+' a été saisie le '+d,'mesAbsences');
  closeModal();showToast('Absence enregistrée !','success');renderAbsences();
}

async function modalModifAbsence(id) {
  var ra=await supa.from('absences').select('*').eq('id',id).maybeSingle();
  var a=ra.data; if(!a)return;
  var mc=a.motif_code||a.motif||'';
  setModal('✏️ Modifier / Justifier',
    '<div class="form-group"><label class="form-label">Motif officiel</label>'+motifSelect(mc)+'</div>'+
    '<div class="form-group"><label class="form-label">Commentaire</label><textarea class="form-control" id="f-commentaire" rows="3">'+(a.commentaire||'')+'</textarea></div>'+
    '<div class="form-group" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="f-justif"'+(a.justifiee?' checked':'')+'>'+
    '<label for="f-justif" class="form-label" style="margin:0">Justifiée</label></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="majAbsence(\''+id+'\')">Enregistrer</button>'
  );
}

async function majAbsence(id) {
  var mc=g('f-motif-code')||null;
  var r=await supa.from('absences').update({motif:mc,motif_code:mc,commentaire:document.getElementById('f-commentaire').value,justifiee:document.getElementById('f-justif').checked}).eq('id',id);
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Mis à jour !','success');renderAbsences();
}

async function toggleJustif(id,val){
  await supa.from('absences').update({justifiee:val}).eq('id',id);
  renderAbsences();
}
async function delAbsence(id){
  if(!confirm('Supprimer cette absence ?'))return;
  await supa.from('absences').delete().eq('id',id);
  showToast('Supprimé','success');renderAbsences();
}

// ── 14. SANCTIONS / RETENUES (admin) ─────────
var SANCTION_COLORS={'Retenue':'#E65100','Avertissement':'#F9A825','Exclusion temporaire':'#9C27B0','Convocation parents':'#C62828','Travail supplémentaire':'#1565C0'};

registerPage('sanctions', async function() {
  var el=document.getElementById('page-sanctions');
  el.innerHTML=
    '<div class="breadcrumb">M13 Studio <span>Retenues & Sanctions</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">⚠️ Retenues & Sanctions</div>'+
    '<div style="display:flex;gap:6px">'+
      '<button class="btn btn-sm" style="background:#E65100;color:white;border:none" onclick="modalSanction(\'Retenue\')">🕐 Retenue</button>'+
      '<button class="btn btn-sm" style="background:#F9A825;color:#263238;border:none" onclick="modalSanction(\'Avertissement\')">⚡ Avert.</button>'+
      '<button class="btn btn-sm" style="background:#9C27B0;color:white;border:none" onclick="modalSanction(\'Exclusion temporaire\')">🚫 Exclusion</button>'+
      '<button class="btn btn-sm" style="background:#C62828;color:white;border:none" onclick="modalSanction(\'Convocation parents\')">👨‍👩‍👦 Conv.</button>'+
    '</div></div>'+
    '<div class="card-body" style="padding:8px 16px"><div class="tabs">'+
      '<div class="tab active" onclick="renderSanctions(\'tous\',this)">Toutes</div>'+
      '<div class="tab" onclick="renderSanctions(\'en_attente\',this)">⏳ À valider</div>'+
      '<div class="tab" onclick="renderSanctions(\'validee\',this)">✅ Validées</div>'+
      '<div class="tab" onclick="renderSanctions(\'refusee\',this)">❌ Refusées</div>'+
    '</div></div>'+
    '<div id="san-body"></div></div>';
  renderSanctions('tous');
});

async function renderSanctions(filtre, tabEl) {
  if(tabEl){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});tabEl.classList.add('active');}
  var q=supa.from('sanctions').select('*,profiles!sanctions_eleve_id_fkey(nom,prenom,classes(nom)),profiles!sanctions_prononcee_par_fkey(nom,prenom,role)');
  if(filtre&&filtre!=='tous') q=q.eq('statut',filtre);
  var r=await q.order('date',{ascending:false});
  var data=r.data||[];
  var body=document.getElementById('san-body');
  if(!body)return;
  if(!data.length){body.innerHTML='<div style="padding:24px;text-align:center;color:#90A4AE">Aucune sanction.</div>';return;}
  var rows=data.map(function(s){
    var tc=SANCTION_COLORS[s.type]||'#546E7A';
    var txtC=s.type==='Avertissement'?'#263238':'white';
    var statutBadge=s.statut==='en_attente'?'<span class="badge badge-orange">⏳ En attente</span>':s.statut==='validee'?'<span class="badge badge-vert">✅ Validée</span>':'<span class="badge badge-rouge">❌ Refusée</span>';
    var prononcePar=s['profiles!sanctions_prononcee_par_fkey']||{};
    return '<tr>'+
      '<td><strong>'+(s.profiles?s.profiles.prenom+' '+s.profiles.nom:'')+'</strong><br><span style="font-size:11px;color:#90A4AE">'+(s.profiles&&s.profiles.classes?s.profiles.classes.nom:'')+'</span></td>'+
      '<td><span style="background:'+tc+';color:'+txtC+';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+s.type+'</span></td>'+
      '<td style="font-size:12.5px;max-width:220px">'+(s.motif||'-')+'</td>'+
      '<td style="font-size:11.5px;color:#546E7A">'+fmt(s.date)+'</td>'+
      '<td style="font-size:11.5px">'+(s.date_execution?fmt(s.date_execution)+(s.heure_debut_retenue?'<br><span style="color:#90A4AE">'+s.heure_debut_retenue.substring(0,5)+(s.heure_fin_retenue?'→'+s.heure_fin_retenue.substring(0,5):'')+(s.lieu_retenue?' · '+s.lieu_retenue:'')+'</span>':''):'—')+'</td>'+
      '<td style="font-size:11px;color:#546E7A">'+(prononcePar.prenom?prononcePar.prenom+' '+prononcePar.nom+' <span class="badge badge-gris" style="font-size:9px">'+labelRole(prononcePar.role)+'</span>':'-')+'</td>'+
      '<td>'+statutBadge+'</td>'+
      '<td>'+
        (s.statut==='en_attente'?'<button class="btn btn-success btn-sm" onclick="validerSanction(\''+s.id+'\')">✅</button> <button class="btn btn-danger btn-sm" onclick="refuserSanction(\''+s.id+'\')">❌</button> ':'')+
        '<button class="btn btn-danger btn-sm" onclick="delSanction(\''+s.id+'\')">🗑️</button>'+
      '</td>'+
    '</tr>';
  }).join('');
  body.innerHTML='<div class="table-container"><table><thead><tr><th>Élève</th><th>Type</th><th>Motif</th><th>Date</th><th>Retenue planifiée</th><th>Prononcée par</th><th>Statut</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

async function modalSanction(typeDefaut) {
  var re=await db.profiles({role:'acteur',actif:true});
  typeDefaut=typeDefaut||'Retenue';
  var isRetenue=typeDefaut==='Retenue';
  setModal('⚠️ '+typeDefaut,
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Type *</label><select class="form-control" id="f-type">'+Object.keys(SANCTION_COLORS).map(function(t){return '<option'+(t===typeDefaut?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Motif / Raison détaillée *</label><textarea class="form-control" id="f-motif" rows="4" placeholder="Décrivez précisément la raison…"></textarea></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-group"><label class="form-label">Date de la faute</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
      (isRetenue?'<div class="form-group"><label class="form-label">📅 Date retenue</label><input class="form-control" id="f-date-exec" type="date"></div>':'<div></div>')+
    '</div>'+
    (isRetenue?'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><div class="form-group"><label class="form-label">Début</label><input class="form-control" id="f-h-debut" type="time" value="17:00"></div><div class="form-group"><label class="form-label">Fin</label><input class="form-control" id="f-h-fin" type="time" value="18:00"></div><div class="form-group"><label class="form-label">Salle</label><input class="form-control" id="f-lieu" placeholder="Salle 204"></div></div>':''),
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="sauvegarderSanction()">Enregistrer</button>'
  );
}

async function sauvegarderSanction() {
  var eid=g('f-eleve'), motif=document.getElementById('f-motif')?document.getElementById('f-motif').value.trim():'';
  if(!eid){showToast('Sélectionnez un élève','warning');return;}
  if(!motif){showToast('Le motif est obligatoire','warning');return;}
  var payload={eleve_id:eid,type:g('f-type'),motif:motif,date:g('f-date')||today(),prononcee_par:currentUser.id,statut:'validee'};
  var fields=['f-date-exec','f-h-debut','f-h-fin','f-lieu'];
  var keys=['date_execution','heure_debut_retenue','heure_fin_retenue','lieu_retenue'];
  fields.forEach(function(fid,i){var el=document.getElementById(fid);if(el&&el.value)payload[keys[i]]=el.value;});
  var r=await supa.from('sanctions').insert(payload);
  if(r.error){showToast(r.error.message,'danger');return;}
  // Notifier l'élève
  await creerNotif(eid,'sanction','⚠️ '+payload.type,''+payload.motif.substring(0,80),'mesSanctions');
  closeModal();showToast(payload.type+' enregistrée !','success');renderSanctions('tous');
}

async function validerSanction(id) {
  var rs=await supa.from('sanctions').select('*').eq('id',id).maybeSingle();
  var s=rs.data;
  if(!s)return;
  await supa.from('sanctions').update({statut:'validee'}).eq('id',id);
  await creerNotif(s.eleve_id,'sanction','⚠️ Retenue validée','Votre retenue a été confirmée : '+s.motif.substring(0,60),'mesSanctions');
  showToast('Retenue validée !','success');renderSanctions('en_attente');
}

async function refuserSanction(id) {
  var motif=prompt('Raison du refus (l\'élève en sera informé) :');
  if(motif===null)return;
  var rs=await supa.from('sanctions').select('*').eq('id',id).maybeSingle();
  var s=rs.data;
  if(!s)return;
  await supa.from('sanctions').update({statut:'refusee'}).eq('id',id);
  await creerNotif(s.eleve_id,'sanction','✅ Retenue refusée','Votre demande de retenue a été refusée'+(motif?' : '+motif:''),'mesSanctions');
  showToast('Retenue refusée.','warning');renderSanctions('en_attente');
}

async function delSanction(id){
  if(!confirm('Supprimer ?'))return;
  await supa.from('sanctions').delete().eq('id',id);
  showToast('Supprimée','success');renderSanctions('tous');
}

// ── 15. ÉLÈVES (admin) ───────────────────────
registerPage('eleves', async function() {
  var el=document.getElementById('page-eleves');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Acteurs</span></div><div class="card"><div class="card-header"><div class="card-title">🎓 Acteurs (Élèves)</div><div style="display:flex;gap:8px"><input class="form-control" id="se" placeholder="Rechercher…" style="width:200px" oninput="renderEleves(this.value)">'+(currentRole==='realisateur'?'<button class="btn btn-primary btn-sm" onclick="modalEleve()">+ Ajouter</button>':'')+'</div></div><div id="eleves-body"></div></div>';
  renderEleves('');
});

async function renderEleves(search) {
  var r=await db.profiles({role:'acteur'});
  var data=(r.data||[]).filter(function(e){return !search||(e.prenom+' '+e.nom+' '+e.identifiant).toLowerCase().includes(search.toLowerCase());});
  var rows=data.map(function(e){return '<tr><td><strong>'+e.nom+'</strong></td><td>'+e.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+e.identifiant+'</code></td><td>'+(e.classes?e.classes.nom:'-')+'</td><td><span class="badge '+(e.actif?'badge-vert':'badge-rouge')+'">'+(e.actif?'Actif':'Inactif')+'</span></td>'+(currentRole==='realisateur'?'<td><button class="btn btn-secondary btn-sm" onclick="modalEleve(\''+e.id+'\')">✏️</button> <button class="btn btn-sm" style="background:#F3E5F5;color:#6A1B9A;border:none" onclick="voirDossierEleve(\''+e.id+'\')">📁 Dossier</button> <button class="btn btn-danger btn-sm" onclick="desactiverUser(\''+e.id+'\')">🗑️</button></td>':'')+'</tr>';}).join('');
  var body=document.getElementById('eleves-body');
  if(body) body.innerHTML='<div class="table-container"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe</th><th>Statut</th>'+(currentRole==='realisateur'?'<th>Actions</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

async function voirDossierEleve(id) {
  var rp=await supa.from('profiles').select('*,classes(nom)').eq('id',id).maybeSingle();
  var e=rp.data; if(!e)return;
  var [rn,ra,rs]=await Promise.all([
    db.notes({eleve_id:id}),
    db.absences({eleve_id:id}),
    db.sanctions({eleve_id:id})
  ]);
  var notes=rn.data||[],abs=ra.data||[],sanct=rs.data||[];
  var moy=notes.length?notes.reduce(function(s,n){return s+(n.valeur/n.sur*20);},0)/notes.length:null;
  var nbAbs=abs.filter(function(a){return a.type==='absence';}).length;
  var nbRet=abs.filter(function(a){return a.type==='retard';}).length;
  setModal('📁 Dossier — '+e.prenom+' '+e.nom,
    '<div style="display:flex;gap:16px;margin-bottom:16px">'+
      '<div style="flex:1;background:#E3F2FD;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:'+( moy?( moy>=14?'#2E7D32':moy>=10?'#E65100':'#C62828'):'#546E7A')+'">'+(moy?moy.toFixed(2)+'/20':'-')+'</div><div style="font-size:12px;color:#546E7A">Moyenne générale</div></div>'+
      '<div style="flex:1;background:#FFEBEE;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#C62828">'+nbAbs+'</div><div style="font-size:12px;color:#546E7A">Absences</div></div>'+
      '<div style="flex:1;background:#FFF3E0;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#E65100">'+nbRet+'</div><div style="font-size:12px;color:#546E7A">Retards</div></div>'+
      '<div style="flex:1;background:#F3E5F5;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#9C27B0">'+sanct.length+'</div><div style="font-size:12px;color:#546E7A">Sanctions</div></div>'+
    '</div>'+
    '<div style="font-size:13px"><strong>Classe :</strong> '+(e.classes?e.classes.nom:'-')+' &nbsp; <strong>Identifiant :</strong> '+e.identifiant+'</div>'+
    '<div style="margin-top:12px"><strong style="font-size:13px">Dernières absences :</strong>'+
      (abs.slice(0,4).map(function(a){return '<div style="font-size:12.5px;padding:4px 0;border-bottom:1px solid #f0f4f8">'+fmt(a.date)+' — '+a.type+' '+motifBadge(a.motif_code||a.motif)+'</div>';}).join('')||'<div style="font-size:12.5px;color:#90A4AE;padding:4px 0">Aucune</div>')+'</div>'+
    '<div style="margin-top:12px"><strong style="font-size:13px">Dernières sanctions :</strong>'+
      (sanct.slice(0,3).map(function(s){return '<div style="font-size:12.5px;padding:4px 0;border-bottom:1px solid #f0f4f8">'+fmt(s.date)+' — <span style="background:'+(SANCTION_COLORS[s.type]||'#546E7A')+';color:white;padding:1px 6px;border-radius:8px;font-size:11px">'+s.type+'</span> '+( s.motif||'').substring(0,60)+'</div>';}).join('')||'<div style="font-size:12.5px;color:#90A4AE;padding:4px 0">Aucune</div>')+'</div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Fermer</button><button class="btn btn-primary" onclick="closeModal();navigate(\'bulletins\')">📄 Voir le bulletin</button>'
  );
}

async function modalEleve(id) {
  id=id||null;
  var rc=await db.classes();
  var u=null;if(id){var ru=await supa.from('profiles').select('*').eq('id',id).maybeSingle();u=ru.data;}
  setModal(id?'Modifier acteur':'Ajouter un acteur',
    mf('Nom *','f-nom',u?u.nom:'')+mf('Prénom *','f-prenom',u?u.prenom:'')+
    mf('Identifiant *','f-ident',u?u.identifiant:'')+
    '<div class="form-group"><label class="form-label">Mot de passe '+(id?'(vide = inchangé)':'*')+'</label><input class="form-control" id="f-pwd" type="password"></div>'+
    '<div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">-- Aucune --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'"'+(u&&u.classe_id===c.id?' selected':'')+'>'+c.nom+'</option>';}).join('')+'</select></div>'+
    mf('Email','f-email',u?u.email||'':''),
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="sauvegarderEleve(\''+( id||'')+'\')">Enregistrer</button>'
  );
}

async function sauvegarderEleve(id) {
  var nom=g('f-nom'),prenom=g('f-prenom'),ident=g('f-ident'),pwd=document.getElementById('f-pwd').value;
  if(!nom||!prenom||!ident){showToast('Champs obligatoires','warning');return;}
  var data={nom,prenom,identifiant:ident,classe_id:g('f-classe')||null,email:g('f-email'),role:'acteur'};
  if(pwd) data.mot_de_passe_hash=pwd;
  if(id){var r=await supa.from('profiles').update(data).eq('id',id);if(r.error){showToast(r.error.message,'danger');return;}}
  else{if(!pwd){showToast('Mot de passe requis','warning');return;}data.actif=true;var r2=await supa.from('profiles').insert(data);if(r2.error){showToast(r2.error.message,'danger');return;}}
  closeModal();showToast('Enregistré !','success');renderEleves('');
}

async function desactiverUser(id){
  if(!confirm('Désactiver ce compte ?'))return;
  await supa.from('profiles').update({actif:false}).eq('id',id);
  showToast('Compte désactivé','success');renderEleves('');
}

// ── 16. MODÉRATEURS (admin) ──────────────────
registerPage('profs', async function() {
  var el=document.getElementById('page-profs');
  var r=await db.profiles({role:'moderateur'});
  var rows=(r.data||[]).map(function(p){return '<tr><td><strong>'+p.nom+'</strong></td><td>'+p.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+p.identifiant+'</code></td><td><span class="badge '+(p.actif?'badge-vert':'badge-rouge')+'">'+(p.actif?'Actif':'Inactif')+'</span></td>'+(currentRole==='realisateur'?'<td><button class="btn btn-danger btn-sm" onclick="desactiverUser(\''+p.id+'\')">🗑️</button></td>':'')+'</tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Modérateurs</span></div><div class="card"><div class="card-header"><div class="card-title">🎭 Modérateurs</div>'+(currentRole==='realisateur'?'<button class="btn btn-primary btn-sm" onclick="modalModo()">+ Ajouter</button>':'')+'</div><div class="table-container"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Statut</th>'+(currentRole==='realisateur'?'<th>Actions</th>':'')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
});

async function modalModo(){
  setModal('Ajouter un modérateur',
    mf('Nom *','f-nom','')+mf('Prénom *','f-prenom','')+mf('Identifiant *','f-ident','')+
    '<div class="form-group"><label class="form-label">Mot de passe *</label><input class="form-control" id="f-pwd" type="password"></div>'+mf('Email','f-email',''),
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveModo()">Créer</button>'
  );
}
async function saveModo(){
  var nom=g('f-nom'),prenom=g('f-prenom'),ident=g('f-ident'),pwd=document.getElementById('f-pwd').value;
  if(!nom||!prenom||!ident||!pwd){showToast('Champs obligatoires','warning');return;}
  var r=await supa.from('profiles').insert({nom,prenom,identifiant:ident,mot_de_passe_hash:pwd,role:'moderateur',actif:true});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Modérateur créé !','success');navigate('profs');
}

// ── 17. CLASSES, EDT, NOTES, CAHIER (admin) ──
registerPage('classes', async function() {
  var el=document.getElementById('page-classes');
  var r=await db.classes();
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Classes</span></div><div class="card"><div class="card-header"><div class="card-title">🏫 Classes</div><button class="btn btn-primary btn-sm" onclick="modalClasse()">+ Créer</button></div><div class="table-container"><table><thead><tr><th>Nom</th><th>Niveau</th><th>Année</th><th>Actions</th></tr></thead><tbody>'+(r.data||[]).map(function(c){return '<tr><td><strong>'+c.nom+'</strong></td><td>'+(c.niveau||'-')+'</td><td>'+c.annee_scolaire+'</td><td><button class="btn btn-danger btn-sm" onclick="delClasse(\''+c.id+'\')">🗑️</button></td></tr>';}).join('')+'</tbody></table></div></div>';
});
async function modalClasse(){setModal('Créer une classe',mf('Nom *','f-nom','')+mf('Niveau','f-niveau','')+mf('Année','f-annee','2024-2025'),'<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveClasse()">Créer</button>');}
async function saveClasse(){var nom=g('f-nom');if(!nom){showToast('Nom requis','warning');return;}var r=await supa.from('classes').insert({nom,niveau:g('f-niveau'),annee_scolaire:g('f-annee')});if(r.error){showToast(r.error.message,'danger');return;}closeModal();showToast('Classe créée !','success');navigate('classes');}
async function delClasse(id){if(!confirm('Supprimer ?'))return;await supa.from('classes').update({actif:false}).eq('id',id);navigate('classes');}

registerPage('edt', async function() {
  var el=document.getElementById('page-edt');
  var rc=await db.classes();
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Emploi du temps</span></div><div class="card"><div class="card-header"><div class="card-title">📅 Emploi du temps</div><div style="display:flex;gap:8px;align-items:center"><select class="form-control" id="edt-cl" onchange="renderEDT()" style="width:170px"><option value="">-- Choisir classe --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select>'+(isAdmin()?'<button class="btn btn-primary btn-sm" onclick="modalCreneau()">+ Ajouter</button>':'')+'</div></div><div class="card-body" id="edt-c"><div class="alert alert-info">Sélectionnez une classe.</div></div></div>';
});
async function renderEDT(){
  var cid=g('edt-cl');if(!cid)return;
  var r=await db.edt(cid);
  var jours=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
  var heures=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  var h='<div style="overflow-x:auto"><div class="edt-grid" style="min-width:700px"><div class="edt-header">Horaire</div>'+jours.map(function(j){return '<div class="edt-header">'+j+'</div>';}).join('');
  for(var i=0;i<heures.length-1;i++){
    h+='<div class="edt-time">'+heures[i]+'<br><span style="color:#B0BEC5;font-size:10px">'+heures[i+1]+'</span></div>';
    jours.forEach(function(j){
      var c=(r.data||[]).find(function(x){return x.jour===j&&x.heure_debut<=heures[i]&&x.heure_fin>heures[i];});
      if(c){h+='<div class="edt-cell"><div class="edt-cours" style="background:'+c.matieres.couleur+'22;border-left:3px solid '+c.matieres.couleur+';color:'+c.matieres.couleur+'"><div>'+c.matieres.nom+'</div><div style="font-size:10px;opacity:.8">'+(c.profiles?c.profiles.prenom+' '+c.profiles.nom:'')+'</div><div style="font-size:10px">'+(c.salle||'')+'</div>'+(isAdmin()?'<div onclick="delCreneau(\''+c.id+'\')" style="font-size:9px;color:rgba(0,0,0,.3);cursor:pointer;margin-top:2px">✕ retirer</div>':'')+'</div></div>';}
      else{h+='<div class="edt-cell"></div>';}
    });
  }
  h+='</div></div>';
  document.getElementById('edt-c').innerHTML=h;
}
async function modalCreneau(){
  var rc=await db.classes(),rm=await db.matieres();
  var rp=await supa.from('profiles').select('*').in('role',['moderateur','acteur']).eq('actif',true);
  setModal('Ajouter un créneau',
    '<div class="form-group"><label class="form-label">Classe *</label><select class="form-control" id="f-classe">'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Enseignant (peut être un acteur)</label><select class="form-control" id="f-prof"><option value="">-- Aucun --</option>'+(rp.data||[]).map(function(p){return '<option value="'+p.id+'">'+p.prenom+' '+p.nom+' ('+labelRole(p.role)+')</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Jour *</label><select class="form-control" id="f-jour">'+['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(function(j){return '<option>'+j+'</option>';}).join('')+'</select></div><div class="form-group"><label class="form-label">Salle</label><input class="form-control" id="f-salle"></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Début *</label><input class="form-control" id="f-hdebut" type="time" value="08:00"></div><div class="form-group"><label class="form-label">Fin *</label><input class="form-control" id="f-hfin" type="time" value="09:00"></div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCreneau()">Ajouter</button>'
  );
}
async function saveCreneau(){
  var r=await supa.from('emploi_du_temps').insert({classe_id:g('f-classe'),matiere_id:g('f-matiere'),professeur_id:g('f-prof')||null,jour:g('f-jour'),heure_debut:g('f-hdebut'),heure_fin:g('f-hfin'),salle:g('f-salle')});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Créneau ajouté !','success');renderEDT();
}
async function delCreneau(id){await supa.from('emploi_du_temps').update({actif:false}).eq('id',id);renderEDT();}

// NOTES (admin)
var _notePeriode='T1';
registerPage('notes', async function() {
  var el=document.getElementById('page-notes');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Notes</span></div><div class="card"><div class="card-header"><div class="card-title">📝 Notes</div><button class="btn btn-primary btn-sm" onclick="modalNote()">+ Ajouter</button></div><div class="card-body"><div class="tabs"><div class="tab active" onclick="swPer(\'T1\',this)">Trimestre 1</div><div class="tab" onclick="swPer(\'T2\',this)">Trimestre 2</div><div class="tab" onclick="swPer(\'T3\',this)">Trimestre 3</div></div><div id="notes-body"></div></div></div>';
  renderNotes('T1');
});
async function renderNotes(p){
  _notePeriode=p||_notePeriode;
  var r=await db.notes({periode:_notePeriode});
  var rows=(r.data||[]).map(function(n){return '<tr><td>'+(n.profiles?n.profiles.prenom+' '+n.profiles.nom:'')+'</td><td><span style="background:'+n.matieres.couleur+'22;color:'+n.matieres.couleur+';padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600">'+n.matieres.nom+'</span></td><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td>'+fmt(n.date)+'</td><td><button class="btn btn-danger btn-sm" onclick="delNote(\''+n.id+'\')">🗑️</button></td></tr>';}).join('');
  var b=document.getElementById('notes-body');if(b)b.innerHTML='<div class="table-container"><table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th><th>Intitulé</th><th>Date</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function swPer(p,el){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});el.classList.add('active');renderNotes(p);}
async function modalNote(){
  var re=await db.profiles({role:'acteur',actif:true}),rm=await db.matieres();
  setModal('Ajouter une note',
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"><div class="form-group"><label class="form-label">Note *</label><input class="form-control" id="f-note" type="number" min="0" max="20" step="0.5" value="10"></div><div class="form-group"><label class="form-label">Sur</label><input class="form-control" id="f-sur" type="number" value="20"></div><div class="form-group"><label class="form-label">Coeff.</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div></div>'+
    mf('Intitulé','f-intitule','','Ex: Contrôle ch.3')+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div><div class="form-group"><label class="form-label">Période</label><select class="form-control" id="f-periode"><option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option></select></div></div>'+
    '<div class="form-group"><label class="form-label">Commentaire</label><textarea class="form-control" id="f-comment" rows="2"></textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveNote()">Enregistrer</button>'
  );
}
async function saveNote(){
  var eid=g('f-eleve'),mid=g('f-matiere'),val=parseFloat(g('f-note'));
  if(!eid||!mid||isNaN(val)){showToast('Champs obligatoires','warning');return;}
  var r=await supa.from('notes').insert({eleve_id:eid,matiere_id:mid,valeur:val,sur:parseFloat(g('f-sur'))||20,coefficient:parseFloat(g('f-coeff'))||1,intitule:g('f-intitule'),date:g('f-date'),periode:g('f-periode'),commentaire:document.getElementById('f-comment').value,professeur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  await creerNotif(eid,'note','📝 Nouvelle note : '+val+'/'+( g('f-sur')||20),'Matière : '+(g('f-intitule')||'N/A'),'monnotes');
  closeModal();showToast('Note enregistrée !','success');renderNotes();
}
async function delNote(id){if(!confirm('Supprimer ?'))return;await supa.from('notes').delete().eq('id',id);renderNotes();}

// CAHIER
registerPage('cahier', async function() {
  var el=document.getElementById('page-cahier');
  var rc=await db.classes();
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Cahier de textes</span></div><div class="card"><div class="card-header"><div class="card-title">📖 Cahier de textes</div><div style="display:flex;gap:8px"><select class="form-control" id="cah-cl" onchange="renderCahier()" style="width:170px"><option value="">-- Toutes classes --</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select><button class="btn btn-primary btn-sm" onclick="modalCahier()">+ Ajouter</button></div></div><div id="cah-body" class="card-body"></div></div>';
  renderCahier();
});
async function renderCahier(){
  var cid=g('cah-cl');
  var q=supa.from('cahier_textes').select('*,matieres(nom,couleur),classes(nom),profiles(nom,prenom)');
  if(cid) q=q.eq('classe_id',cid);
  var r=await q.order('date',{ascending:false});
  var b=document.getElementById('cah-body');if(!b)return;
  if(!(r.data||[]).length){b.innerHTML='<div class="alert alert-info">Aucune entrée.</div>';return;}
  b.innerHTML=(r.data||[]).map(function(e){return '<div style="border:1px solid var(--gris-border);border-radius:6px;padding:14px;margin-bottom:12px;border-left:4px solid '+(e.matieres?e.matieres.couleur:'#1565C0')+'"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:700;color:'+(e.matieres?e.matieres.couleur:'#1565C0')+'">'+(e.matieres?e.matieres.nom:'?')+'</span><span class="text-muted text-sm">'+fmt(e.date)+' | '+(e.classes?e.classes.nom:'-')+' | '+(e.profiles?e.profiles.prenom+' '+e.profiles.nom:'')+'</span></div>'+(e.contenu_cours?'<div style="margin-bottom:8px"><strong style="font-size:12px;color:#546E7A">📚 Cours :</strong><div style="margin-top:4px">'+e.contenu_cours+'</div></div>':'')+(e.devoirs?'<div><strong style="font-size:12px;color:#546E7A">📝 Devoirs :</strong><div style="margin-top:4px">'+e.devoirs+'</div>'+(e.date_remise?'<div class="text-sm text-muted">📅 À rendre le '+fmt(e.date_remise)+'</div>':'')+'</div>':'')+'</div>';}).join('');
}
async function modalCahier(){
  var rc=await db.classes(),rm=await db.matieres();
  setModal('Ajouter au cahier',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Classe *</label><select class="form-control" id="f-classe">'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div><div class="form-group"><label class="form-label">Matière *</label><select class="form-control" id="f-matiere">'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div></div>'+
    '<div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label class="form-label">Contenu du cours</label><textarea class="form-control" id="f-contenu" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Devoirs</label><textarea class="form-control" id="f-devoirs" rows="3"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Date de remise</label><input class="form-control" id="f-remise" type="date"></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCahier()">Enregistrer</button>'
  );
}
async function saveCahier(){
  var r=await supa.from('cahier_textes').insert({classe_id:g('f-classe'),matiere_id:g('f-matiere'),date:g('f-date'),contenu_cours:document.getElementById('f-contenu').value,devoirs:document.getElementById('f-devoirs').value,date_remise:g('f-remise')||null,professeur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Entrée ajoutée !','success');renderCahier();
}

// ── 18. BULLETINS (admin) ────────────────────
registerPage('bulletins', async function() {
  var el=document.getElementById('page-bulletins');
  var re=await db.profiles({role:'acteur',actif:true});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Bulletins</span></div><div class="card"><div class="card-header"><div class="card-title">📄 Bulletins scolaires</div><div style="display:flex;gap:8px"><select class="form-control" id="bul-e" style="width:200px"><option value="">-- Élève --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select><select class="form-control" id="bul-p" style="width:120px"><option value="T1">Trimestre 1</option><option value="T2">Trimestre 2</option><option value="T3">Trimestre 3</option></select><button class="btn btn-primary btn-sm" onclick="genBulletin()">Générer</button></div></div><div id="bul-c" class="card-body"><div class="alert alert-info">Sélectionnez un élève et une période.</div></div></div>';
});
async function genBulletin(){
  var eid=document.getElementById('bul-e').value,per=document.getElementById('bul-p').value;
  if(!eid){showToast('Choisissez un élève','warning');return;}
  var [rp,rn,ra]=await Promise.all([supa.from('profiles').select('*,classes(nom)').eq('id',eid).maybeSingle(),db.notes({eleve_id:eid,periode:per}),db.absences({eleve_id:eid})]);
  var eleve=rp.data,notes=rn.data||[],abs=ra.data||[];
  var pm={};notes.forEach(function(n){var m=n.matieres.nom;if(!pm[m])pm[m]={ns:[],c:n.matieres.couleur};pm[m].ns.push(n);});
  var rows=Object.entries(pm).map(function(kv){var mat=kv[0],ns=kv[1].ns,col=kv[1].c;var tc=ns.reduce(function(s,n){return s+n.coefficient;},0);var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0;return {mat,moy,nb:ns.length,col};});
  var mg=rows.length?rows.reduce(function(s,r){return s+r.moy;},0)/rows.length:null;
  var na=abs.filter(function(a){return a.type==='absence';}).length,nr=abs.filter(function(a){return a.type==='retard';}).length;
  var lp={T1:'1er Trimestre',T2:'2ème Trimestre',T3:'3ème Trimestre'}[per];
  document.getElementById('bul-c').innerHTML='<div style="max-width:800px;margin:0 auto"><div style="background:var(--bleu-pronote);color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center"><div style="font-family:Raleway,sans-serif;font-size:24px;font-weight:800;letter-spacing:2px">M13 STUDIO</div><div style="font-size:13px;opacity:.8">Bulletin scolaire — '+lp+' 2024-2025</div></div><div style="background:#F5F9FF;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border:1px solid #DDE3EA;border-top:none"><div><strong>'+eleve.prenom+' '+eleve.nom+'</strong><br><span class="text-muted text-sm">Classe : '+(eleve.classes?eleve.classes.nom:'-')+'</span></div><div><span class="badge badge-rouge" style="margin-right:6px">Abs: '+na+'</span><span class="badge badge-orange">Retards: '+nr+'</span></div></div><table style="width:100%;border-collapse:collapse;border:1px solid #DDE3EA;border-top:none"><thead><tr style="background:#EEF2F7"><th style="padding:10px 14px;text-align:left;font-size:11.5px;color:#546E7A">Matière</th><th style="padding:10px 14px;text-align:center;font-size:11.5px;color:#546E7A">Notes</th><th style="padding:10px 14px;text-align:center;font-size:11.5px;color:#546E7A">Moyenne</th></tr></thead><tbody>'+rows.map(function(r){return '<tr style="border-bottom:1px solid #F0F4F8"><td style="padding:10px 14px;border-left:3px solid '+(r.col||'#1565C0')+'"><strong>'+r.mat+'</strong></td><td style="padding:10px 14px;text-align:center;color:#546E7A">'+r.nb+'</td><td style="padding:10px 14px;text-align:center"><span style="font-size:18px;font-weight:800;color:'+(r.moy>=14?'#2E7D32':r.moy>=10?'#E65100':'#C62828')+'">'+r.moy.toFixed(2)+'</span><span style="color:#90A4AE;font-size:12px">/20</span></td></tr>';}).join('')+'</tbody></table>'+(mg!==null?'<div style="background:#E3F2FD;padding:16px 20px;border:1px solid #DDE3EA;border-top:none;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center"><strong style="color:#1565C0">Moyenne générale</strong><span style="font-size:28px;font-weight:800;color:'+(mg>=14?'#2E7D32':mg>=10?'#E65100':'#C62828')+'">'+mg.toFixed(2)+'<span style="font-size:16px;color:#90A4AE">/20</span></span></div>':'')+'</div>';
}

// ── 19. GESTION COMPTES (réalisateur) ────────
registerPage('comptes', async function() {
  var el=document.getElementById('page-comptes');
  var r=await supa.from('profiles').select('*,classes(nom)').order('role').order('nom');
  var rows=(r.data||[]).map(function(u){return '<tr><td><span class="badge '+(u.role==='realisateur'?'badge-violet':u.role==='moderateur'?'badge-bleu':u.role==='parent'?'badge-orange':'badge-vert')+'">'+(u.role==='realisateur'?'🎬':u.role==='moderateur'?'🎭':u.role==='parent'?'👨‍👩‍👦':'🎓')+' '+labelRole(u.role)+'</span></td><td><strong>'+u.nom+'</strong></td><td>'+u.prenom+'</td><td><code style="font-size:12px;background:#f0f4f8;padding:2px 6px;border-radius:4px">'+u.identifiant+'</code></td><td>'+(u.classes?u.classes.nom:'-')+'</td><td><span class="badge '+(u.actif?'badge-vert':'badge-rouge')+'">'+(u.actif?'Actif':'Inactif')+'</span></td><td>'+(u.role==='acteur'?'<button class="btn btn-secondary btn-sm" onclick="modalEleve(\''+u.id+'\')">✏️</button> <button class="btn btn-sm" style="background:#E3F2FD;color:#1565C0;border:none" onclick="resetPassword(\''+u.id+'\')">🔑</button> ':'')+( u.id!==currentUser.id?'<button class="btn btn-danger btn-sm" onclick="desactiverUser(\''+u.id+'\')">🗑️</button>':'')+'</td></tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Gestion des comptes</span></div><div class="card"><div class="card-header"><div class="card-title">👥 Tous les comptes</div><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="modalEleve()">+ Acteur</button><button class="btn btn-secondary btn-sm" onclick="modalModo()">+ Modérateur</button><button class="btn btn-sm" style="background:#FFF3E0;color:#E65100;border:1px solid #FFB74D" onclick="modalParent()">+ Parent</button></div></div><div class="table-container"><table><thead><tr><th>Rôle</th><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Classe/Enfant</th><th>Statut</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
});

async function resetPassword(id) {
  var newPwd=prompt('Nouveau mot de passe :');
  if(!newPwd||newPwd.length<6){showToast('Mot de passe trop court','warning');return;}
  var r=await supa.from('profiles').update({mot_de_passe_hash:newPwd}).eq('id',id);
  if(r.error){showToast(r.error.message,'danger');return;}
  showToast('Mot de passe réinitialisé !','success');
}

async function modalParent(){
  var re=await db.profiles({role:'acteur',actif:true});
  setModal('👨‍👩‍👦 Ajouter un parent',
    mf('Nom *','f-nom','')+mf('Prénom *','f-prenom','')+mf('Identifiant *','f-ident','')+
    '<div class="form-group"><label class="form-label">Mot de passe *</label><input class="form-control" id="f-pwd" type="password"></div>'+
    '<div class="form-group"><label class="form-label">Enfant (acteur lié)</label><select class="form-control" id="f-enfant"><option value="">-- Aucun --</option>'+(re.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    mf('Email','f-email','','parent@exemple.com'),
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveParent()">Créer</button>'
  );
}
async function saveParent(){
  var nom=g('f-nom'),prenom=g('f-prenom'),ident=g('f-ident'),pwd=document.getElementById('f-pwd').value;
  if(!nom||!prenom||!ident||!pwd){showToast('Champs obligatoires','warning');return;}
  var r=await supa.from('profiles').insert({nom,prenom,identifiant:ident,mot_de_passe_hash:pwd,role:'parent',classe_id:g('f-enfant')||null,email:g('f-email'),actif:true});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Compte parent créé !','success');navigate('comptes');
}

// ── 20. MATIÈRES, STATS, LOGS (réalisateur) ──
registerPage('matieres', async function() {
  var el=document.getElementById('page-matieres');
  var r=await db.matieres();
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Matières</span></div><div class="card"><div class="card-header"><div class="card-title">📚 Matières</div><button class="btn btn-primary btn-sm" onclick="modalMatiere()">+ Ajouter</button></div><div class="table-container"><table><thead><tr><th>Nom</th><th>Code</th><th>Couleur</th><th>Coeff.</th><th>Actions</th></tr></thead><tbody>'+(r.data||[]).map(function(m){return '<tr><td><span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:3px;background:'+m.couleur+';display:inline-block"></span><strong>'+m.nom+'</strong></span></td><td><code>'+(m.code||'-')+'</code></td><td style="font-size:12px;color:#546E7A">'+m.couleur+'</td><td>'+m.coefficient+'</td><td><button class="btn btn-danger btn-sm" onclick="delMatiere(\''+m.id+'\')">🗑️</button></td></tr>';}).join('')+'</tbody></table></div></div>';
});
async function modalMatiere(){setModal('Ajouter une matière',mf('Nom *','f-nom','')+mf('Code','f-code','')+' <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Couleur</label><input class="form-control" id="f-couleur" type="color" value="#3B82F6" style="height:42px;padding:4px 6px"></div><div class="form-group"><label class="form-label">Coefficient</label><input class="form-control" id="f-coeff" type="number" value="1" step="0.5"></div></div>','<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveMatiere()">Ajouter</button>');}
async function saveMatiere(){var nom=g('f-nom');if(!nom){showToast('Nom requis','warning');return;}var r=await supa.from('matieres').insert({nom,code:g('f-code'),couleur:document.getElementById('f-couleur').value,coefficient:parseFloat(g('f-coeff'))||1});if(r.error){showToast(r.error.message,'danger');return;}closeModal();showToast('Matière créée !','success');navigate('matieres');}
async function delMatiere(id){if(!confirm('Supprimer ?'))return;await supa.from('matieres').update({actif:false}).eq('id',id);navigate('matieres');}

registerPage('admin_stats', async function() {
  var el=document.getElementById('page-admin_stats');
  var [r1,r2,r3,r4]=await Promise.all([
    supa.from('profiles').select('role').eq('actif',true),
    supa.from('absences').select('type,date').gte('date',new Date(Date.now()-30*24*3600*1000).toISOString().split('T')[0]),
    supa.from('notes').select('valeur,sur'),
    supa.from('sanctions').select('type,statut'),
  ]);
  var roles={acteur:0,moderateur:0,realisateur:0,parent:0};
  (r1.data||[]).forEach(function(p){if(roles[p.role]!==undefined)roles[p.role]++;});
  var absences30=(r2.data||[]).filter(function(a){return a.type==='absence';}).length;
  var retards30=(r2.data||[]).filter(function(a){return a.type==='retard';}).length;
  var allNotes=r3.data||[];
  var moyGlobale=allNotes.length?allNotes.reduce(function(s,n){return s+(n.valeur/n.sur*20);},0)/allNotes.length:null;
  var sanctEnAttente=(r4.data||[]).filter(function(s){return s.statut==='en_attente';}).length;
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Statistiques</span></div>'+
    '<div class="dashboard-grid" style="margin-bottom:20px">'+
      sc('🎓','#E3F2FD',roles.acteur,'Acteurs')+
      sc('🎭','#E8F5E9',roles.moderateur,'Modérateurs')+
      sc('👨‍👩‍👦','#FFF3E0',roles.parent,'Parents')+
      sc('📝','#F3E5F5',allNotes.length,'Notes totales')+
    '</div>'+
    '<div class="dashboard-grid">'+
      sc('📋','#FFEBEE',absences30,'Absences (30j)')+
      sc('⏱️','#FFF3E0',retards30,'Retards (30j)')+
      sc('⚠️','#F3E5F5',sanctEnAttente,'Retenues à valider')+
      sc('📊','#E3F2FD',moyGlobale?moyGlobale.toFixed(2)+'/20':'-','Moyenne globale')+
    '</div>';
});

registerPage('admin_logs', async function() {
  var el=document.getElementById('page-admin_logs');
  var r=await supa.from('notifications').select('*,profiles!notifications_destinataire_id_fkey(nom,prenom)').order('creee_le',{ascending:false}).limit(50);
  var rows=(r.data||[]).map(function(n){var icons={sanction:'⚠️',absence:'📋',note:'📝',message:'✉️',validation:'✅',parent:'👨‍👩‍👦',info:'ℹ️'};return '<tr><td style="font-size:12px">'+fmtDT(n.creee_le)+'</td><td>'+(icons[n.type]||'🔔')+' <strong>'+n.titre+'</strong></td><td style="font-size:12px">'+(n.profiles?n.profiles.prenom+' '+n.profiles.nom:'-')+'</td><td style="font-size:12px;color:#546E7A">'+(n.message||'').substring(0,80)+'</td><td><span class="badge '+(n.lue?'badge-gris':'badge-bleu')+'">'+(n.lue?'Lu':'Non lu')+'</span></td></tr>';}).join('');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Journal d\'activité</span></div><div class="card"><div class="card-header"><div class="card-title">🔍 Journal des notifications (50 dernières)</div></div><div class="table-container"><table><thead><tr><th>Date</th><th>Événement</th><th>Destinataire</th><th>Détail</th><th>Statut</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
});

registerPage('admin_parametres', async function() {
  var el=document.getElementById('page-admin_parametres');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Paramètres</span></div>'+
    '<div class="dashboard-grid">'+
      '<div class="card"><div class="card-header"><div class="card-title">🏫 Établissement</div></div><div class="card-body">'+
        mf('Nom de l\'école','p-nom','M13 Studio')+mf('Année scolaire','p-annee','2024-2025')+
        '<button class="btn btn-primary btn-sm">Enregistrer</button>'+
      '</div></div>'+
      '<div class="card"><div class="card-header"><div class="card-title">🔒 Sécurité</div></div><div class="card-body">'+
        '<div class="alert alert-info">Toutes les retenues soumises par les acteurs nécessitent une validation admin.</div>'+
        '<div class="alert alert-info">Les parents peuvent soumettre des justifications, soumises à validation.</div>'+
      '</div></div>'+
      '<div class="card"><div class="card-header"><div class="card-title">📊 Données</div></div><div class="card-body">'+
        '<button class="btn btn-secondary btn-sm" onclick="exportAbsences()">📥 Export absences CSV</button><br><br>'+
        '<button class="btn btn-secondary btn-sm" onclick="exportNotes()">📥 Export notes CSV</button>'+
      '</div></div>'+
    '</div>';
});

async function exportAbsences(){
  var r=await supa.from('absences').select('*,profiles!absences_eleve_id_fkey(nom,prenom)').order('date',{ascending:false});
  var csv='Élève,Date,Type,Motif,Justifiée\n'+(r.data||[]).map(function(a){return (a.profiles?a.profiles.prenom+' '+a.profiles.nom:'')+','+a.date+','+a.type+','+(a.motif_code||a.motif||'')+','+(a.justifiee?'Oui':'Non');}).join('\n');
  var blob=new Blob([csv],{type:'text/csv'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='absences_m13.csv';a.click();
}
async function exportNotes(){
  var r=await supa.from('notes').select('*,profiles!notes_eleve_id_fkey(nom,prenom),matieres(nom)').order('date',{ascending:false});
  var csv='Élève,Matière,Note,Sur,Coefficient,Date,Période\n'+(r.data||[]).map(function(n){return (n.profiles?n.profiles.prenom+' '+n.profiles.nom:'')+','+(n.matieres?n.matieres.nom:'')+','+n.valeur+','+n.sur+','+n.coefficient+','+n.date+','+n.periode;}).join('\n');
  var blob=new Blob([csv],{type:'text/csv'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='notes_m13.csv';a.click();
}

// ── 21. MESSAGERIE ───────────────────────────
registerPage('messages', async function() {
  var el=document.getElementById('page-messages');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Messagerie</span></div><div style="display:grid;grid-template-columns:300px 1fr;gap:16px"><div class="card" style="max-height:580px;display:flex;flex-direction:column"><div class="card-header" style="flex-shrink:0"><div class="card-title">✉️ Reçus</div><button class="btn btn-primary btn-sm" onclick="modalMsg()">+ Nouveau</button></div><div id="msg-l" style="overflow-y:auto;flex:1"></div></div><div class="card" id="msg-d" style="max-height:580px;display:flex;flex-direction:column"><div class="card-body" style="flex:1;display:flex;align-items:center;justify-content:center;color:#90A4AE">Sélectionnez un message</div></div></div>';
  renderMsgs();
});
async function renderMsgs(){
  var r=await supa.from('messages').select('*,profiles!messages_expediteur_id_fkey(nom,prenom)').eq('destinataire_id',currentUser.id).is('parent_id',null).order('date_envoi',{ascending:false});
  var el=document.getElementById('msg-l');if(!el)return;
  if(!(r.data||[]).length){el.innerHTML='<div style="padding:16px;text-align:center;color:#90A4AE;font-size:13px">Aucun message</div>';return;}
  el.innerHTML=(r.data||[]).map(function(m){return '<div onclick="openMsg(\''+m.id+'\')" style="padding:12px 14px;border-bottom:1px solid var(--gris-border);cursor:pointer;background:'+(m.lu?'white':'#F0F7FF')+'" onmouseover="this.style.background=\'#EEF5FF\'" onmouseout="this.style.background=\''+(m.lu?'white':'#F0F7FF')+'\'"><div style="display:flex;justify-content:space-between;font-size:12px"><strong>'+(m.profiles?m.profiles.prenom+' '+m.profiles.nom:'')+'</strong><span class="text-muted">'+fmtDT(m.date_envoi)+'</span></div><div style="font-size:13px;font-weight:'+(m.lu?400:700)+';margin-top:2px">'+(m.sujet||'(Sans sujet)')+'</div></div>';}).join('');
}
async function openMsg(id){
  var r=await supa.from('messages').select('*,profiles!messages_expediteur_id_fkey(nom,prenom)').eq('id',id).maybeSingle();
  await supa.from('messages').update({lu:true}).eq('id',id);loadNotificationsBar();
  var m=r.data;
  document.getElementById('msg-d').innerHTML='<div class="card-header" style="flex-shrink:0"><div><div class="card-title">'+(m.sujet||'(Sans sujet)')+'</div><div class="text-sm text-muted">De : '+(m.profiles?m.profiles.prenom+' '+m.profiles.nom:'')+' | '+fmtDT(m.date_envoi)+'</div></div><button class="btn btn-secondary btn-sm" onclick="modalMsg(\''+m.expediteur_id+'\')">↩ Répondre</button></div><div class="card-body" style="overflow-y:auto;flex:1;white-space:pre-wrap;line-height:1.6">'+(m.contenu||'')+'</div>';
  renderMsgs();
}
async function modalMsg(destId){
  destId=destId||null;
  var ru=await supa.from('profiles').select('id,nom,prenom,role').eq('actif',true);
  setModal('Nouveau message',
    '<div class="form-group"><label class="form-label">Destinataire *</label><select class="form-control" id="f-dest"><option value="">-- Choisir --</option>'+(ru.data||[]).filter(function(u){return u.id!==currentUser.id;}).map(function(u){return '<option value="'+u.id+'"'+(u.id===destId?' selected':'')+'>'+u.prenom+' '+u.nom+' ('+labelRole(u.role)+')</option>';}).join('')+'</select></div>'+
    mf('Sujet','f-sujet','','Objet du message')+
    '<div class="form-group"><label class="form-label">Message *</label><textarea class="form-control" id="f-contenu" rows="6"></textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="sendMsg()">Envoyer ✉️</button>'
  );
}
async function sendMsg(){
  var dest=g('f-dest'),contenu=document.getElementById('f-contenu').value.trim();
  if(!dest||!contenu){showToast('Destinataire et message requis','warning');return;}
  var r=await supa.from('messages').insert({destinataire_id:dest,sujet:g('f-sujet'),contenu,expediteur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  await creerNotif(dest,'message','✉️ Nouveau message de '+currentUser.prenom+' '+currentUser.nom,contenu.substring(0,60),'messages');
  closeModal();showToast('Message envoyé !','success');renderMsgs();
}

// ── 22. PUBLICATIONS, AGENDA, RESSOURCES ─────
registerPage('publications', async function() {
  var el=document.getElementById('page-publications');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Publications</span></div>'+
    '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📢 Publications</div>'+
    '<div style="display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" onclick="modalPub(\'info\')">📋 Info</button>'+
      '<button class="btn btn-secondary btn-sm" onclick="modalPub(\'sondage\')">📊 Sondage</button>'+
    '</div></div>'+
    '<div class="card-body" style="padding:8px 16px"><div class="tabs">'+
      '<div class="tab active" onclick="renderPubs(\'publie\',this)">Publiées</div>'+
      '<div class="tab" onclick="renderPubs(\'draft\',this)">⏳ En attente</div>'+
    '</div></div></div><div id="pubs-list"></div>';
  renderPubs('publie');
});

async function renderPubs(statut,tabEl){
  if(tabEl){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});tabEl.classList.add('active');}
  var q=supa.from('publications').select('*,profiles!publications_auteur_id_fkey(nom,prenom,role)');
  if(statut==='publie') q=q.eq('statut','published');
  else q=q.eq('statut','draft');
  var r=await q.order('creee_le',{ascending:false});
  var el=document.getElementById('pubs-list');if(!el)return;
  var pubs=r.data||[];
  if(!pubs.length){el.innerHTML='<div class="alert alert-info">Aucune publication.</div>';return;}
  el.innerHTML='';
  for(var i=0;i<pubs.length;i++) el.innerHTML+=await renderOnePub(pubs[i]);
}

async function renderOnePub(pub){
  var auteur=pub.profiles?pub.profiles.prenom+' '+pub.profiles.nom:'?';
  var h='<div style="background:white;border-radius:8px;border:1px solid var(--gris-border);padding:18px;margin-bottom:14px;box-shadow:var(--ombre)">';
  h+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">';
  h+='<div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">'+(pub.type==='info'?'📋':'📊')+'</span>';
  h+='<div><div style="font-weight:700;font-size:15px">'+pub.titre+'</div>';
  h+='<div style="font-size:12px;color:#90A4AE;margin-top:2px">'+auteur+' · '+fmtDT(pub.creee_le)+(pub.statut==='draft'?' · <span class="badge badge-orange">En attente</span>':'')+'</div></div></div>';
  if(isAdmin()){
    h+='<div style="display:flex;gap:6px">';
    if(pub.statut==='draft'){h+='<button class="btn btn-success btn-sm" onclick="validerPub(\''+pub.id+'\')">✅</button><button class="btn btn-danger btn-sm" onclick="rejeterPub(\''+pub.id+'\')">❌</button>';}
    h+='<button class="btn btn-danger btn-sm" onclick="delPub(\''+pub.id+'\')">🗑️</button>';
    h+='</div>';
  }
  h+='</div>';
  if(pub.contenu) h+='<div style="font-size:13.5px;line-height:1.6;margin-bottom:14px;color:#37474F">'+pub.contenu+'</div>';
  if(pub.type==='sondage'&&pub.statut==='published') h+=await renderSondage(pub);
  if(pub.type==='info'&&pub.statut==='published') h+=await renderPriseConscience(pub);
  return h+'</div>';
}

async function renderSondage(pub){
  var opts=pub.options||[];
  var rr=await supa.from('sondage_reponses').select('*').eq('publication_id',pub.id);
  var reponses=rr.data||[],total=reponses.length;
  var maRep=reponses.find(function(r){return r.auteur_id===currentUser.id;});
  var h='<div style="background:#F5F9FF;border-radius:8px;padding:14px;border:1px solid #BBDEFB"><div style="font-size:12.5px;font-weight:700;color:#1565C0;margin-bottom:10px">📊 '+total+' réponse(s)</div>';
  opts.forEach(function(opt){
    var nb=reponses.filter(function(r){return r.reponse===opt;}).length;
    var pct=total>0?Math.round(nb/total*100):0;
    var isChosen=maRep&&maRep.reponse===opt;
    h+='<div style="margin-bottom:8px">';
    if(!maRep){h+='<button onclick="voterSondage(\''+pub.id+'\',\''+opt.replace(/'/g,"\\'")+'\''+')" style="width:100%;text-align:left;padding:10px 14px;border-radius:6px;border:2px solid '+(isChosen?'#1565C0':'#DDE3EA')+';background:white;cursor:pointer;font-size:13px">'+opt+'</button>';}
    else{h+='<div style="padding:4px 0"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="font-weight:'+(isChosen?700:400)+'">'+opt+(isChosen?' ✓':'')+'</span><span>'+nb+' ('+pct+'%)</span></div><div style="height:8px;background:#E3F2FD;border-radius:4px"><div style="height:8px;background:'+(isChosen?'#1565C0':'#90CAF9')+';border-radius:4px;width:'+pct+'%;transition:width .4s"></div></div></div>';}
    h+='</div>';
  });
  return h+'</div>';
}

async function renderPriseConscience(pub){
  var rl=await supa.from('info_lues').select('id').eq('publication_id',pub.id).eq('utilisateur_id',currentUser.id).maybeSingle();
  var aLu=rl.data!==null;
  var rt=await supa.from('info_lues').select('id',{count:'exact',head:true}).eq('publication_id',pub.id);
  var h='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:'+(aLu?'#E8F5E9':'#FFF3E0')+';border-radius:8px;margin-top:8px;border:1px solid '+(aLu?'#A5D6A7':'#FFE082')+'">';
  if(aLu){h+='<span style="font-size:13px;color:#2E7D32;font-weight:600">✅ Information prise en compte</span>';}
  else{h+='<span style="font-size:13px;color:#E65100">⚠️ Veuillez prendre connaissance</span><button class="btn btn-sm" style="background:#E65100;color:white;border:none" onclick="prendreConscience(\''+pub.id+'\')">J\'ai lu ✓</button>';}
  h+='<span style="font-size:12px;color:#78909C;margin-left:8px">'+(rt.count||0)+' lecture(s)</span></div>';
  return h;
}

async function voterSondage(pubId,reponse){
  var r=await supa.from('sondage_reponses').insert({publication_id:pubId,auteur_id:currentUser.id,reponse:reponse});
  if(r.error){showToast('Erreur','danger');return;}
  showToast('Vote enregistré !','success');renderPubs('publie');
}
async function prendreConscience(pubId){
  await supa.from('info_lues').insert({publication_id:pubId,utilisateur_id:currentUser.id});
  showToast('Prise de conscience enregistrée !','success');renderPubs('publie');
}
async function validerPub(id){await supa.from('publications').update({statut:'published',valide_par:currentUser.id,date_validation:new Date().toISOString()}).eq('id',id);showToast('Publié !','success');renderPubs('draft');}
async function rejeterPub(id){if(!confirm('Rejeter cette publication ?'))return;await supa.from('publications').update({statut:'rejected'}).eq('id',id);showToast('Rejetée','warning');renderPubs('draft');}
async function delPub(id){if(!confirm('Supprimer ?'))return;await supa.from('publications').delete().eq('id',id);renderPubs('publie');}

async function modalPub(type){
  var rc=await db.classes();
  var needsValidation=currentRole==='acteur';
  setModal(type==='info'?'📋 Nouvelle information':'📊 Nouveau sondage',
    mf('Titre *','f-titre','')+
    '<div class="form-group"><label class="form-label">Contenu</label><textarea class="form-control" id="f-contenu" rows="4"></textarea></div>'+
    (type==='sondage'?'<div class="form-group"><label class="form-label">Options (une par ligne) *</label><textarea class="form-control" id="f-options" rows="4" placeholder="Oui\nNon\nPeut-être"></textarea></div>':'')+
    '<div class="form-group"><label class="form-label">Destinataires</label><select class="form-control" id="f-cible"><option value="tous">Tous</option><option value="classe">Une classe</option></select></div>'+
    (needsValidation?'<div class="alert alert-warning" style="margin-top:8px">⚠️ Votre publication sera soumise à validation.</div>':''),
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePub(\''+type+'\')">'+(needsValidation?'Soumettre':'Publier')+'</button>'
  );
}
async function savePub(type){
  var titre=g('f-titre');if(!titre){showToast('Titre requis','warning');return;}
  var opts=null;
  if(type==='sondage'){var ot=document.getElementById('f-options')?document.getElementById('f-options').value.trim():'';opts=ot.split('\n').map(function(o){return o.trim();}).filter(function(o){return o;});if(opts.length<2){showToast('Au moins 2 options','warning');return;}}
  var statut=currentRole==='acteur'?'draft':'published';
  var r=await supa.from('publications').insert({auteur_id:currentUser.id,type,titre,contenu:document.getElementById('f-contenu').value||null,options:opts,statut,demande_validation:currentRole==='acteur'});
  if(r.error){showToast(r.error.message,'danger');return;}
  // Notifier les admins si demande validation
  if(statut==='draft'&&isAdmin()){
    await creerNotif(currentUser.id,'validation','📢 Publication en attente',''+currentUser.prenom+' a soumis une publication à valider','publications');
  }
  closeModal();showToast(statut==='draft'?'Soumis pour validation !':'Publié !','success');renderPubs('publie');
}

// AGENDA
registerPage('agenda', async function() {
  var el=document.getElementById('page-agenda');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Agenda</span></div><div class="card"><div class="card-header"><div class="card-title">📅 Agenda & Événements</div>'+(isAdmin()?'<button class="btn btn-primary btn-sm" onclick="modalEvent()">+ Ajouter</button>':'')+'</div><div id="agenda-list" class="card-body"></div></div>';
  var r=await supa.from('evenements').select('*,classes(nom)').gte('date_debut',today()).order('date_debut').limit(30);
  var icons={evenement:'📅',examen:'📝',sortie:'🚌',reunion:'👥',autre:'📌'};
  var colors={evenement:'#1565C0',examen:'#C62828',sortie:'#2E7D32',reunion:'#6A1B9A',autre:'#455A64'};
  document.getElementById('agenda-list').innerHTML=(r.data||[]).length?
    (r.data||[]).map(function(e){return '<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--gris-border);align-items:flex-start"><div style="background:'+(colors[e.type]||'#1565C0')+'22;border-radius:8px;padding:10px;text-align:center;min-width:54px;flex-shrink:0"><div style="font-size:18px">'+(icons[e.type]||'📅')+'</div><div style="font-size:10px;font-weight:700;color:'+(colors[e.type]||'#1565C0')+'">'+fmt(e.date_debut)+'</div></div><div style="flex:1"><div style="font-weight:700;font-size:14px">'+e.titre+'</div><div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+(e.heure_debut?e.heure_debut.substring(0,5)+(e.heure_fin?'→'+e.heure_fin.substring(0,5):''):'')+( e.classes?' · '+e.classes.nom:'')+'</div>'+(e.description?'<div style="font-size:13px;color:#37474F;margin-top:4px">'+e.description+'</div>':'')+'</div>'+(isAdmin()?'<button class="btn btn-danger btn-sm" onclick="delEvent(\''+e.id+'\')">🗑️</button>':'')+'</div>';}).join(''):
    '<div class="alert alert-info">Aucun événement à venir.</div>';
});
async function modalEvent(){
  var rc=await db.classes();
  setModal('Ajouter un événement',
    mf('Titre *','f-titre','')+
    '<div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="f-desc" rows="2"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="evenement">Événement</option><option value="examen">Examen</option><option value="sortie">Sortie scolaire</option><option value="reunion">Réunion</option><option value="autre">Autre</option></select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Date début *</label><input class="form-control" id="f-ddebut" type="date" value="'+today()+'"></div><div class="form-group"><label class="form-label">Date fin</label><input class="form-control" id="f-dfin" type="date"></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Heure début</label><input class="form-control" id="f-hdebut" type="time"></div><div class="form-group"><label class="form-label">Heure fin</label><input class="form-control" id="f-hfin" type="time"></div></div>'+
    '<div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">Tous</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEvent()">Ajouter</button>'
  );
}
async function saveEvent(){
  var titre=g('f-titre');if(!titre){showToast('Titre requis','warning');return;}
  var r=await supa.from('evenements').insert({titre,description:document.getElementById('f-desc').value||null,type:g('f-type'),date_debut:g('f-ddebut'),date_fin:g('f-dfin')||null,heure_debut:g('f-hdebut')||null,heure_fin:g('f-hfin')||null,classe_id:g('f-classe')||null,createur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Événement ajouté !','success');navigate('agenda');
}
async function delEvent(id){if(!confirm('Supprimer ?'))return;await supa.from('evenements').delete().eq('id',id);navigate('agenda');}

// RESSOURCES
registerPage('ressources', async function() {
  var el=document.getElementById('page-ressources');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Ressources</span></div><div class="card"><div class="card-header"><div class="card-title">📂 Ressources partagées</div>'+(isAdmin()?'<button class="btn btn-primary btn-sm" onclick="modalRess()">+ Ajouter</button>':'')+'</div><div id="ress-list" class="card-body"></div></div>';
  var r=await supa.from('ressources').select('*,matieres(nom,couleur),classes(nom),profiles!ressources_auteur_id_fkey(nom,prenom)').order('creee_le',{ascending:false});
  var icons={document:'📄',video:'🎥',lien:'🔗',exercice:'📝',autre:'📦'};
  document.getElementById('ress-list').innerHTML=(r.data||[]).length?
    (r.data||[]).map(function(res){return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--gris-border)"><span style="font-size:24px">'+(icons[res.type]||'📄')+'</span><div style="flex:1"><a href="'+res.url+'" target="_blank" style="font-weight:700;font-size:14px;color:var(--bleu-pronote);text-decoration:none">'+res.titre+'</a><div style="font-size:12px;color:#90A4AE;margin-top:2px">'+(res.matieres?'<span style="background:'+res.matieres.couleur+'22;color:'+res.matieres.couleur+';padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600">'+res.matieres.nom+'</span> ':'')+( res.classes?res.classes.nom+' · ':'')+( res.profiles?res.profiles.prenom+' '+res.profiles.nom:'')+' · '+fmt(res.creee_le)+'</div>'+(res.description?'<div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+res.description+'</div>':'')+'</div><a href="'+res.url+'" target="_blank" class="btn btn-secondary btn-sm">🔗 Ouvrir</a>'+(isAdmin()?'<button class="btn btn-danger btn-sm" onclick="delRess(\''+res.id+'\')">🗑️</button>':'')+'</div>';}).join(''):
    '<div class="alert alert-info">Aucune ressource partagée.</div>';
});
async function modalRess(){
  var rm=await db.matieres(),rc=await db.classes();
  setModal('Ajouter une ressource',
    mf('Titre *','f-titre','')+mf('URL *','f-url','','https://…')+
    '<div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="f-desc" rows="2"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="document">Document</option><option value="video">Vidéo</option><option value="lien">Lien</option><option value="exercice">Exercice</option><option value="autre">Autre</option></select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="form-group"><label class="form-label">Matière</label><select class="form-control" id="f-matiere"><option value="">Toutes</option>'+(rm.data||[]).map(function(m){return '<option value="'+m.id+'">'+m.nom+'</option>';}).join('')+'</select></div><div class="form-group"><label class="form-label">Classe</label><select class="form-control" id="f-classe"><option value="">Toutes</option>'+(rc.data||[]).map(function(c){return '<option value="'+c.id+'">'+c.nom+'</option>';}).join('')+'</select></div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveRess()">Ajouter</button>'
  );
}
async function saveRess(){
  var titre=g('f-titre'),url=g('f-url');if(!titre||!url){showToast('Titre et URL requis','warning');return;}
  var r=await supa.from('ressources').insert({titre,url,description:document.getElementById('f-desc').value||null,type:g('f-type'),matiere_id:g('f-matiere')||null,classe_id:g('f-classe')||null,auteur_id:currentUser.id});
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Ressource ajoutée !','success');navigate('ressources');
}
async function delRess(id){if(!confirm('Supprimer ?'))return;await supa.from('ressources').delete().eq('id',id);navigate('ressources');}

// ─────────────────────────────────────────────
// ══ PAGES ACTEUR (ÉLÈVE) ════════════════════
// ─────────────────────────────────────────────

// ── 23. DASHBOARD ACTEUR ─────────────────────
registerPage('mondashboard', async function() {
  var el=document.getElementById('page-mondashboard');
  var [rn,ra,rd,rnotif]=await Promise.all([
    db.notes({eleve_id:currentUser.id}),
    db.absences({eleve_id:currentUser.id}),
    supa.from('cahier_textes').select('*,matieres(nom,couleur)').gte('date_remise',today()).order('date_remise').limit(5),
    db.notifs(currentUser.id)
  ]);
  var notes=rn.data||[],abs=ra.data||[],devoirs=rd.data||[],notifs=rnotif.data||[];
  var moy=notes.length?notes.reduce(function(s,n){return s+(n.valeur/n.sur*20);},0)/notes.length:null;
  var nbAbs=abs.filter(function(a){return a.type==='absence';}).length;
  var nbRet=abs.filter(function(a){return a.type==='retard';}).length;
  var nbSanct=(await db.sanctions({eleve_id:currentUser.id})).data?.length||0;
  el.innerHTML=
    '<div class="breadcrumb">M13 Studio <span>Mon espace</span></div>'+
    // Bannière alertes
    (notifs.length?'<div style="background:#FFF3E0;border:1px solid #FFB74D;border-radius:8px;padding:12px 16px;margin-bottom:16px;border-left:4px solid #E65100">'+
      '<div style="font-weight:700;color:#E65100;margin-bottom:6px">🔔 '+notifs.length+' notification(s) non lue(s)</div>'+
      notifs.slice(0,3).map(function(n){return '<div style="font-size:12.5px;padding:3px 0;color:#546E7A">'+({sanction:'⚠️',absence:'📋',note:'📝',message:'✉️',validation:'✅',parent:'👨‍👩‍👦',info:'ℹ️'}[n.type]||'🔔')+' <strong>'+n.titre+'</strong> — '+n.message+'</div>';}).join('')+
      '<div style="margin-top:6px"><button class="btn btn-sm" style="background:#E65100;color:white;border:none" onclick="navigate(\'notifications\')">Voir toutes</button></div>'+
    '</div>':'')+ 
    '<div style="background:var(--bleu-pronote);color:white;border-radius:10px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px">'+
      '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;border:2px solid rgba(255,255,255,.4)">'+initials(currentUser.nom,currentUser.prenom)+'</div>'+
      '<div><div style="font-family:Raleway,sans-serif;font-size:18px;font-weight:800">Bonjour, '+currentUser.prenom+' !</div>'+
      '<div style="font-size:12.5px;opacity:.8">M13 Studio · '+today()+'</div></div>'+
    '</div>'+
    '<div class="dashboard-grid" style="margin-bottom:20px">'+
      sc('📝','#E3F2FD',moy!==null?'<span class="'+noteColor(moy)+'">'+moy.toFixed(2)+'/20</span>':'-','Moyenne générale')+
      sc('📋','#FFEBEE',nbAbs,'Absences')+
      sc('⏱️','#FFF3E0',nbRet,'Retards')+
      sc('⚠️','#F3E5F5',nbSanct,'Retenues')+
    '</div>'+
    '<div class="card"><div class="card-header"><div class="card-title">📚 Prochains devoirs</div><a onclick="navigate(\'cahier\')" style="font-size:12px;color:var(--bleu-pronote);cursor:pointer">Tout voir →</a></div><div class="card-body">'+
      (devoirs.length===0?'<div class="alert alert-success">Aucun devoir prochainement 🎉</div>':
        devoirs.map(function(d){return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gris-border)"><div style="width:10px;height:10px;border-radius:50%;background:'+(d.matieres?d.matieres.couleur:'#1565C0')+';margin-top:4px;flex-shrink:0"></div><div style="flex:1"><div style="font-weight:600;font-size:13px">'+(d.matieres?d.matieres.nom:'-')+'</div><div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+(d.devoirs||'')+'</div></div><div style="font-size:11.5px;color:var(--rouge);font-weight:600;white-space:nowrap">📅 '+fmt(d.date_remise)+'</div></div>';}).join(''))+'</div></div>';
});

// ── 24. MES NOTES ────────────────────────────
registerPage('monnotes', async function() {
  var el=document.getElementById('page-monnotes');
  var r=await db.notes({eleve_id:currentUser.id});
  var pm={};(r.data||[]).forEach(function(n){var m=n.matieres?n.matieres.nom:'?';if(!pm[m])pm[m]={ns:[],c:n.matieres?n.matieres.couleur:'#1565C0'};pm[m].ns.push(n);});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes notes</span></div>'+
    (!Object.keys(pm).length?'<div class="alert alert-info">Aucune note enregistrée.</div>':
      '<div class="dashboard-grid">'+Object.entries(pm).map(function(kv){
        var mat=kv[0],ns=kv[1].ns,col=kv[1].c;
        var tc=ns.reduce(function(s,n){return s+n.coefficient;},0);
        var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0;
        return '<div class="card"><div class="card-header"><div class="card-title" style="color:'+col+'">'+mat+'</div><span class="note-value '+noteColor(moy)+'" style="font-size:18px;font-weight:800">'+moy.toFixed(2)+'/20</span></div><div class="table-container"><table><thead><tr><th>Note</th><th>Intitulé</th><th>Période</th><th>Date</th></tr></thead><tbody>'+ns.map(function(n){return '<tr><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td><span class="badge badge-bleu">'+n.periode+'</span></td><td>'+fmt(n.date)+'</td></tr>';}).join('')+'</tbody></table></div></div>';
      }).join('')+'</div>');
});

// ── 25. MES ABSENCES ─────────────────────────
registerPage('mesAbsences', async function() {
  var el=document.getElementById('page-mesAbsences');
  var r=await db.absences({eleve_id:currentUser.id});
  var data=r.data||[];
  // Vérifier demandes de justification en cours
  var rdj=await supa.from('demandes_justification').select('*').eq('eleve_id',currentUser.id).order('creee_le',{ascending:false});
  var demandesJustif=rdj.data||[];
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes absences</span></div>'+
    '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📋 Mes absences et retards</div>'+
    '<button class="btn btn-primary btn-sm" onclick="navigate(\'mesJustifications\')">✅ Justifier une absence</button></div>'+
    (data.length?'<div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th></tr></thead><tbody>'+
      data.map(function(a){var mc=a.motif_code||a.motif||null;return '<tr><td>'+fmt(a.date)+'</td><td><span style="background:'+(a.type==='absence'?'#C62828':a.type==='retard'?'#E65100':'#6A1B9A')+';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+a.type+'</span></td><td>'+motifBadge(mc)+'</td><td>'+(a.justifiee?'<span class="badge badge-vert">✅ Oui</span>':'<span class="badge badge-rouge">❌ Non</span>')+'</td></tr>';}).join('')+'</tbody></table></div>':
    '<div style="padding:20px;text-align:center;color:#90A4AE">Aucune absence enregistrée 🎉</div>')+'</div>'+
    (demandesJustif.length?'<div class="card"><div class="card-header"><div class="card-title">⏳ Mes demandes de justification</div></div>'+
      demandesJustif.map(function(d){var sc={'en_attente':'badge-orange','acceptee':'badge-vert','refusee':'badge-rouge'}[d.statut]||'badge-gris';return '<div style="padding:12px 16px;border-bottom:1px solid var(--gris-border)"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13.5px;font-weight:600">'+fmt(d.date_absence)+' — '+d.motif_demande+'</span><span class="badge '+sc+'">'+d.statut+'</span></div>'+(d.reponse_admin?'<div style="font-size:12.5px;color:#546E7A;margin-top:4px">Réponse : '+d.reponse_admin+'</div>':'')+'</div>';}).join('')+'</div>':'');
});

// ── 26. MES RETENUES ─────────────────────────
registerPage('mesSanctions', async function() {
  var el=document.getElementById('page-mesSanctions');
  var r=await db.sanctions({eleve_id:currentUser.id});
  var data=r.data||[];
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes retenues & sanctions</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">⚠️ Mes retenues & sanctions</div></div>'+
    (data.length?'<div class="table-container"><table><thead><tr><th>Type</th><th>Motif</th><th>Date</th><th>Retenue le</th><th>Statut</th></tr></thead><tbody>'+
      data.map(function(s){
        var tc=SANCTION_COLORS[s.type]||'#546E7A';
        var sc={en_attente:'⏳ En attente de validation',validee:'✅ Confirmée',refusee:'❌ Refusée'}[s.statut]||s.statut;
        var scBadge={en_attente:'badge-orange',validee:'badge-vert',refusee:'badge-rouge'}[s.statut]||'badge-gris';
        return '<tr>'+
          '<td><span style="background:'+tc+';color:'+(s.type==='Avertissement'?'#263238':'white')+';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+s.type+'</span></td>'+
          '<td style="font-size:12.5px;max-width:220px">'+(s.motif||'-')+'</td>'+
          '<td>'+fmt(s.date)+'</td>'+
          '<td>'+(s.date_execution?fmt(s.date_execution)+(s.heure_debut_retenue?'<br><span style="font-size:11px;color:#90A4AE">'+s.heure_debut_retenue.substring(0,5)+(s.heure_fin_retenue?'→'+s.heure_fin_retenue.substring(0,5):'')+(s.lieu_retenue?' · '+s.lieu_retenue:'')+'</span>':''):'—')+'</td>'+
          '<td><span class="badge '+scBadge+'">'+sc+'</span></td>'+
        '</tr>';
      }).join('')+'</tbody></table></div>':
    '<div style="padding:20px;text-align:center;color:#90A4AE">Aucune sanction enregistrée 🎉</div>')+'</div>';
});

// ── 27. MES JUSTIFICATIONS (acteur soumet) ───
registerPage('mesJustifications', async function() {
  var el=document.getElementById('page-mesJustifications');
  var ra=await db.absences({eleve_id:currentUser.id});
  var nonJustifiees=(ra.data||[]).filter(function(a){return !a.justifiee;});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Justifier une absence</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">✅ Demande de justification</div></div>'+
    '<div class="card-body">'+
    '<div class="alert alert-info">Sélectionnez l\'absence à justifier. Votre demande sera examinée par le Modérateur ou le Réalisateur.</div>'+
    (nonJustifiees.length?
      '<div class="form-group"><label class="form-label">Absence à justifier *</label><select class="form-control" id="jus-abs"><option value="">-- Choisir --</option>'+
      nonJustifiees.map(function(a){var mc=a.motif_code||a.motif||'';return '<option value="'+a.id+'">'+fmt(a.date)+' — '+a.type+(mc?' ('+mc+')':'')+'</option>';}).join('')+'</select></div>'+
      '<div class="form-group"><label class="form-label">Motif de votre demande *</label><textarea class="form-control" id="jus-motif" rows="4" placeholder="Expliquez la raison de l\'absence et joignez si possible un justificatif (décrire ici)…"></textarea></div>'+
      '<button class="btn btn-primary" onclick="soumettreDemande()">📨 Soumettre la demande</button>':
      '<div class="alert alert-success">✅ Toutes vos absences sont justifiées !</div>')+'</div></div>';
});

async function soumettreDemande(){
  var absId=g('jus-abs'),motif=document.getElementById('jus-motif').value.trim();
  if(!absId){showToast('Sélectionnez une absence','warning');return;}
  if(!motif||motif.length<10){showToast('Motif trop court (min. 10 caractères)','warning');return;}
  var ra=await supa.from('absences').select('date').eq('id',absId).maybeSingle();
  var r=await supa.from('demandes_justification').insert({eleve_id:currentUser.id,absence_id:absId,date_absence:ra.data?ra.data.date:today(),motif_demande:motif,statut:'en_attente'});
  if(r.error){showToast(r.error.message,'danger');return;}
  // Notifier les admins
  var admins=await supa.from('profiles').select('id').in('role',['moderateur','realisateur']).eq('actif',true);
  for(var i=0;i<(admins.data||[]).length;i++){
    await creerNotif(admins.data[i].id,'parent','✅ Demande de justification',currentUser.prenom+' '+currentUser.nom+' demande à justifier une absence','absences');
  }
  showToast('Demande soumise ! La vie scolaire va examiner votre demande.','success');
  navigate('mesAbsences');
}

// ── 28. NOTIFICATIONS PAGE ───────────────────
registerPage('notifications', async function() {
  var el=document.getElementById('page-notifications');
  var r=await supa.from('notifications').select('*').eq('destinataire_id',currentUser.id).order('creee_le',{ascending:false}).limit(50);
  var notifs=r.data||[];
  var icons={sanction:'⚠️',absence:'📋',note:'📝',message:'✉️',validation:'✅',parent:'👨‍👩‍👦',info:'ℹ️'};
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes notifications</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">🔔 Toutes mes notifications</div>'+
      '<button class="btn btn-secondary btn-sm" onclick="toutMarquerLu()">Tout marquer comme lu</button>'+
    '</div>'+
    (notifs.length?notifs.map(function(n){return '<div style="padding:12px 16px;border-bottom:1px solid var(--gris-border);background:'+(n.lue?'white':'#F0F7FF')+';display:flex;gap:12px;align-items:flex-start"><span style="font-size:20px">'+(icons[n.type]||'🔔')+'</span><div style="flex:1"><div style="font-weight:700;font-size:13.5px">'+(n.lue?'':' <span class="badge badge-bleu" style="font-size:10px">Nouveau</span>')+' '+n.titre+'</div><div style="font-size:12.5px;color:#546E7A;margin-top:2px">'+n.message+'</div><div style="font-size:11px;color:#90A4AE;margin-top:4px">'+fmtDT(n.creee_le)+'</div></div>'+(n.lien_page&&!n.lue?'<button class="btn btn-secondary btn-sm" onclick="marquerNotifLue(\''+n.id+'\',\''+n.lien_page+'\')">Voir →</button>':'')+'</div>';}).join(''):
    '<div style="padding:24px;text-align:center;color:#90A4AE">Aucune notification.</div>')+'</div>';
});

async function toutMarquerLu(){
  await supa.from('notifications').update({lue:true}).eq('destinataire_id',currentUser.id).eq('lue',false);
  showToast('Tout marqué comme lu','success');loadNotificationsBar();navigate('notifications');
}

// ── 29. MES COURS (acteur-prof) ──────────────
registerPage('mesCours', async function() {
  var el=document.getElementById('page-mesCours');
  if(!el){el=document.createElement('div');el.className='page';el.id='page-mesCours';document.querySelector('.main-content').appendChild(el);}
  if(!monsCours.length){el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes cours</span></div><div class="alert alert-info">Vous n\'êtes assigné à aucun cours pour le moment.</div>';return;}
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes cours</span></div>'+
    '<div class="dashboard-grid">'+
    monsCours.map(function(c){
      return '<div class="card" style="border-left:4px solid '+c.matieres.couleur+'">'+
        '<div class="card-header"><div class="card-title" style="color:'+c.matieres.couleur+'">'+c.matieres.nom+'</div><span class="badge badge-bleu">'+c.classes.nom+'</span></div>'+
        '<div class="card-body">'+
          '<div style="font-size:13px;color:#546E7A;margin-bottom:12px">📅 '+c.jour+' · '+c.heure_debut.substring(0,5)+' → '+c.heure_fin.substring(0,5)+(c.salle?' · 🏫 '+c.salle:'')+'</div>'+
          '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
            '<button class="btn btn-secondary btn-sm" onclick="voirElevesClasse(\''+c.classes.id+'\',\''+c.classes.nom+'\')">👥 Élèves</button>'+
            '<button class="btn btn-primary btn-sm" onclick="faireAppel(\''+c.id+'\',\''+c.classes.id+'\',\''+c.matieres.nom+'\')">📋 Appel</button>'+
            '<button class="btn btn-sm" style="background:#E65100;color:white;border:none" onclick="modalSanctionCours(\''+c.classes.id+'\',\''+c.classes.nom+'\')">⚠️ Retenue</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    }).join('')+'</div>';
});

async function voirElevesClasse(classeId,classeNom){
  var r=await supa.from('profiles').select('*').eq('classe_id',classeId).eq('role','acteur').eq('actif',true).order('nom');
  var ra=await db.absences({classe_id:classeId});
  var absMap={};(ra.data||[]).forEach(function(a){if(!absMap[a.eleve_id])absMap[a.eleve_id]={abs:0,ret:0};if(a.type==='absence')absMap[a.eleve_id].abs++;else if(a.type==='retard')absMap[a.eleve_id].ret++;});
  setModal('👥 Élèves — '+classeNom,
    '<div class="table-container"><table><thead><tr><th>Nom</th><th>Prénom</th><th>Absences</th><th>Retards</th></tr></thead><tbody>'+
    (r.data||[]).map(function(e){var s=absMap[e.id]||{abs:0,ret:0};return '<tr><td><strong>'+e.nom+'</strong></td><td>'+e.prenom+'</td><td><span class="badge '+(s.abs>3?'badge-rouge':s.abs>0?'badge-orange':'badge-vert')+'">'+s.abs+'</span></td><td><span class="badge '+(s.ret>3?'badge-rouge':s.ret>0?'badge-orange':'badge-vert')+'">'+s.ret+'</span></td></tr>';}).join('')+
    '</tbody></table></div>',
    '<button class="btn btn-primary" onclick="closeModal()">Fermer</button>'
  );
}

async function faireAppel(coursId,classeId,matiereNom){
  var r=await supa.from('profiles').select('*').eq('classe_id',classeId).eq('role','acteur').eq('actif',true).order('nom');
  var eleves=r.data||[];
  setModal('📋 Appel — '+matiereNom+' · '+today(),
    '<div style="font-size:12.5px;color:#546E7A;margin-bottom:12px">Cochez les élèves <strong>absents ou en retard</strong> :</div>'+
    '<div style="max-height:380px;overflow-y:auto">'+
    eleves.map(function(e){return '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;border:1px solid var(--gris-border);margin-bottom:6px">'+
      '<span style="font-weight:600;flex:1">'+e.prenom+' '+e.nom+'</span>'+
      '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="radio" name="ap-'+e.id+'" value="present" checked> Présent</label>'+
      '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;color:#E65100"><input type="radio" name="ap-'+e.id+'" value="retard"> Retard</label>'+
      '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;color:#C62828"><input type="radio" name="ap-'+e.id+'" value="absent"> Absent</label>'+
    '</div>';}).join('')+'</div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>'+
    '<button class="btn btn-primary" onclick="validerAppel('+JSON.stringify(eleves.map(function(e){return {id:e.id,nom:e.nom,prenom:e.prenom};}))+ ')">✅ Valider l\'appel</button>'
  );
}

async function validerAppel(eleves){
  var absents=[],t=today();
  eleves.forEach(function(e){
    var rads=document.getElementsByName('ap-'+e.id),val='present';
    rads.forEach(function(r){if(r.checked)val=r.value;});
    if(val!=='present') absents.push({id:e.id,type:val==='absent'?'absence':'retard'});
  });
  if(!absents.length){closeModal();showToast('Appel validé — tous présents ✅','success');return;}
  var inserts=absents.map(function(a){return {eleve_id:a.id,date:t,type:a.type,saisie_par:currentUser.id};});
  var r=await supa.from('absences').insert(inserts);
  if(r.error){showToast(r.error.message,'danger');return;}
  // Notifier chaque élève absent
  for(var i=0;i<absents.length;i++){
    await creerNotif(absents[i].id,'absence','📋 '+absents[i].type+' enregistrée','Le '+t+' (saisie par '+currentUser.prenom+' '+currentUser.nom+')','mesAbsences');
  }
  closeModal();showToast(absents.length+' absence(s)/retard(s) enregistré(s) !','success');
}

// SÉCURITÉ : retenue par acteur → statut en_attente, validation admin requise
async function modalSanctionCours(classeId,classeNom){
  var r=await supa.from('profiles').select('*').eq('classe_id',classeId).eq('role','acteur').eq('actif',true).order('nom');
  setModal('⚠️ Proposer une retenue',
    '<div class="alert alert-warning">⚠️ La retenue sera soumise à validation par la Vie Scolaire avant d\'être confirmée à l\'élève.</div>'+
    '<div class="form-group"><label class="form-label">Élève *</label><select class="form-control" id="f-eleve"><option value="">-- Choisir dans '+classeNom+' --</option>'+(r.data||[]).map(function(e){return '<option value="'+e.id+'">'+e.prenom+' '+e.nom+'</option>';}).join('')+'</select></div>'+
    '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="f-type"><option value="Retenue">Retenue</option><option value="Avertissement">Avertissement</option></select></div>'+
    '<div class="form-group"><label class="form-label">Motif détaillé * (sera revu par la Vie Scolaire)</label><textarea class="form-control" id="f-motif" rows="4" placeholder="Décrivez précisément le comportement…"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Date de la faute</label><input class="form-control" id="f-date" type="date" value="'+today()+'"></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button>'+
    '<button class="btn btn-primary" onclick="soumettreSanction()">📨 Soumettre pour validation</button>'
  );
}

async function soumettreSanction(){
  var eid=g('f-eleve'),motif=document.getElementById('f-motif').value.trim();
  if(!eid){showToast('Sélectionnez un élève','warning');return;}
  if(!motif||motif.length<15){showToast('Motif trop court (min. 15 caractères)','warning');return;}
  var r=await supa.from('sanctions').insert({
    eleve_id:eid,type:g('f-type'),motif:motif,
    date:g('f-date')||today(),
    prononcee_par:currentUser.id,
    statut:'en_attente' // ← SÉCURITÉ : jamais directement validé
  });
  if(r.error){showToast(r.error.message,'danger');return;}
  // Notifier les admins pour validation
  var admins=await supa.from('profiles').select('id').in('role',['moderateur','realisateur']).eq('actif',true);
  for(var i=0;i<(admins.data||[]).length;i++){
    await creerNotif(admins.data[i].id,'sanction','⚠️ Retenue à valider',currentUser.prenom+' '+currentUser.nom+' a proposé une retenue : '+motif.substring(0,60),'sanctions');
  }
  closeModal();showToast('Retenue soumise à la Vie Scolaire !','success');
}

registerPage('mesRetenues', async function() {
  var el=document.getElementById('page-mesRetenues');
  if(!el){el=document.createElement('div');el.className='page';el.id='page-mesRetenues';document.querySelector('.main-content').appendChild(el);}
  var r=await db.sanctions({prononcee_par:currentUser.id});
  var data=r.data||[];
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes retenues saisies</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">⚠️ Retenues que j\'ai soumises</div></div>'+
    (data.length?'<div class="table-container"><table><thead><tr><th>Élève</th><th>Type</th><th>Motif</th><th>Date</th><th>Statut</th></tr></thead><tbody>'+
      data.map(function(s){var tc=SANCTION_COLORS[s.type]||'#546E7A';var sc={en_attente:'badge-orange',validee:'badge-vert',refusee:'badge-rouge'}[s.statut]||'badge-gris';return '<tr><td>'+(s.profiles?s.profiles.prenom+' '+s.profiles.nom:'')+'</td><td><span style="background:'+tc+';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+s.type+'</span></td><td style="font-size:12.5px">'+(s.motif||'-')+'</td><td>'+fmt(s.date)+'</td><td><span class="badge '+sc+'">'+s.statut+'</span></td></tr>';}).join('')+'</tbody></table></div>':
    '<div style="padding:20px;text-align:center;color:#90A4AE">Aucune retenue soumise.</div>')+'</div>';
});

// ── 30. NOTES PERSO ──────────────────────────
var NOTE_COLORS=['#FFF9C4','#F8BBD0','#C8E6C9','#B3E5FC','#E1BEE7','#FFE0B2','#F0F4F8'];
registerPage('notesperso', async function() {
  var el=document.getElementById('page-notesperso');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Mes notes perso</span></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="font-size:16px;font-weight:700;color:var(--bleu-pronote)">📒 Mon carnet</h3><button class="btn btn-primary btn-sm" onclick="modalNotePerso()">+ Nouvelle note</button></div>'+
    '<div id="nperso-list" class="dashboard-grid"></div>';
  renderNotesPerso();
});
async function renderNotesPerso(){
  var r=await supa.from('notes_perso').select('*').eq('utilisateur_id',currentUser.id).order('modifiee_le',{ascending:false});
  var el=document.getElementById('nperso-list');if(!el)return;
  var notes=r.data||[];
  if(!notes.length){el.innerHTML='<div class="alert alert-info" style="grid-column:1/-1">Aucune note personnelle.</div>';return;}
  el.innerHTML=notes.map(function(n){return '<div style="background:'+(n.couleur||'#FFF9C4')+';border-radius:8px;padding:16px;border:1px solid rgba(0,0,0,.08);position:relative"><div style="font-weight:700;font-size:14px;margin-bottom:8px">'+(n.titre||'Sans titre')+'</div><div style="font-size:13px;color:#37474F;white-space:pre-wrap;line-height:1.5;max-height:120px;overflow:hidden">'+(n.contenu||'')+'</div><div style="font-size:11px;color:#78909C;margin-top:10px">'+fmtDT(n.modifiee_le)+'</div><div style="position:absolute;top:10px;right:10px;display:flex;gap:4px"><button style="padding:3px 7px;background:rgba(0,0,0,.08);border:none;border-radius:4px;cursor:pointer" onclick="modalNotePerso(\''+n.id+'\')">✏️</button><button style="padding:3px 7px;background:rgba(198,40,40,.15);border:none;border-radius:4px;cursor:pointer" onclick="delNotePerso(\''+n.id+'\')">🗑️</button></div></div>';}).join('');
}
async function modalNotePerso(id){
  id=id||null;var note=null;
  if(id){var rn=await supa.from('notes_perso').select('*').eq('id',id).maybeSingle();note=rn.data;}
  setModal(id?'✏️ Modifier':'📒 Nouvelle note',
    mf('Titre','f-titre',note?note.titre||'':'')+
    '<div class="form-group"><label class="form-label">Contenu</label><textarea class="form-control" id="f-contenu" rows="6" style="font-family:monospace">'+(note?note.contenu||'':'')+'</textarea></div>'+
    '<div class="form-group"><label class="form-label">Couleur</label><div style="display:flex;gap:8px;flex-wrap:wrap">'+
    NOTE_COLORS.map(function(c){return '<div onclick="selNoteColor(this,\''+c+'\')" data-color="'+c+'" style="width:28px;height:28px;border-radius:50%;background:'+c+';cursor:pointer;border:3px solid '+(note&&note.couleur===c?'#1565C0':'transparent')+'"></div>';}).join('')+
    '</div></div><input type="hidden" id="f-couleur" value="'+(note?note.couleur||NOTE_COLORS[0]:NOTE_COLORS[0])+'">',
    '<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveNotePerso(\''+(id||'')+'\')">Enregistrer</button>'
  );
}
function selNoteColor(el,c){document.querySelectorAll('[data-color]').forEach(function(d){d.style.border='3px solid transparent';});el.style.border='3px solid #1565C0';document.getElementById('f-couleur').value=c;}
async function saveNotePerso(id){
  var d={titre:g('f-titre'),contenu:document.getElementById('f-contenu').value,couleur:g('f-couleur'),utilisateur_id:currentUser.id,modifiee_le:new Date().toISOString()};
  var r;if(id)r=await supa.from('notes_perso').update(d).eq('id',id);else r=await supa.from('notes_perso').insert(d);
  if(r.error){showToast(r.error.message,'danger');return;}
  closeModal();showToast('Note sauvegardée !','success');renderNotesPerso();
}
async function delNotePerso(id){if(!confirm('Supprimer ?'))return;await supa.from('notes_perso').delete().eq('id',id);renderNotesPerso();}

// ─────────────────────────────────────────────
// ══ PAGES PARENT ════════════════════════════
// ─────────────────────────────────────────────

async function getEnfant() {
  // Le parent a son enfant dans classe_id (on stocke l'id de l'enfant)
  // Pour simplifier : classe_id contient l'id du profil de l'enfant
  if(currentUser.classe_id) {
    var r=await supa.from('profiles').select('*,classes(nom)').eq('id',currentUser.classe_id).maybeSingle();
    return r.data;
  }
  return null;
}

registerPage('parentDashboard', async function() {
  var el=document.getElementById('page-parentDashboard');
  var enfant=await getEnfant();
  if(!enfant){el.innerHTML='<div class="alert alert-warning">Aucun enfant lié à ce compte. Contactez le Réalisateur.</div>';return;}
  var [rn,ra,rs]=await Promise.all([db.notes({eleve_id:enfant.id}),db.absences({eleve_id:enfant.id}),db.sanctions({eleve_id:enfant.id})]);
  var notes=rn.data||[],abs=ra.data||[],sanct=rs.data||[];
  var moy=notes.length?notes.reduce(function(s,n){return s+(n.valeur/n.sur*20);},0)/notes.length:null;
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Espace parent</span></div>'+
    '<div style="background:var(--bleu-pronote);color:white;border-radius:10px;padding:20px;margin-bottom:20px">'+
      '<div style="font-size:18px;font-weight:700">👨‍👩‍👦 Espace de '+currentUser.prenom+' '+currentUser.nom+'</div>'+
      '<div style="opacity:.8;font-size:13px;margin-top:4px">Enfant suivi : '+enfant.prenom+' '+enfant.nom+(enfant.classes?' · '+enfant.classes.nom:'')+'</div>'+
    '</div>'+
    '<div class="dashboard-grid">'+
      sc('📝','#E3F2FD',moy!==null?moy.toFixed(2)+'/20':'-','Moyenne générale')+
      sc('📋','#FFEBEE',abs.filter(function(a){return a.type==='absence';}).length,'Absences')+
      sc('⏱️','#FFF3E0',abs.filter(function(a){return a.type==='retard';}).length,'Retards')+
      sc('⚠️','#F3E5F5',sanct.length,'Sanctions')+
    '</div>';
});

registerPage('parentAbsences', async function() {
  var el=document.getElementById('page-parentAbsences');
  var enfant=await getEnfant();if(!enfant){el.innerHTML='<div class="alert alert-warning">Aucun enfant lié.</div>';return;}
  var r=await db.absences({eleve_id:enfant.id});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Absences de '+enfant.prenom+'</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">📋 Absences de '+enfant.prenom+' '+enfant.nom+'</div>'+
      '<button class="btn btn-primary btn-sm" onclick="navigate(\'parentJustifier\')">✅ Justifier</button></div>'+
    ((r.data||[]).length?'<div class="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Justifiée</th></tr></thead><tbody>'+(r.data||[]).map(function(a){return '<tr><td>'+fmt(a.date)+'</td><td><span style="background:'+(a.type==='absence'?'#C62828':'#E65100')+';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+a.type+'</span></td><td>'+motifBadge(a.motif_code||a.motif)+'</td><td>'+(a.justifiee?'<span class="badge badge-vert">✅</span>':'<span class="badge badge-rouge">❌</span>')+'</td></tr>';}).join('')+'</tbody></table></div>':
    '<div style="padding:20px;text-align:center;color:#90A4AE">Aucune absence.</div>')+'</div>';
});

registerPage('parentNotes', async function() {
  var el=document.getElementById('page-parentNotes');
  var enfant=await getEnfant();if(!enfant){el.innerHTML='<div class="alert alert-warning">Aucun enfant lié.</div>';return;}
  var r=await db.notes({eleve_id:enfant.id});
  var pm={};(r.data||[]).forEach(function(n){var m=n.matieres?n.matieres.nom:'?';if(!pm[m])pm[m]={ns:[],c:n.matieres?n.matieres.couleur:'#1565C0'};pm[m].ns.push(n);});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Notes de '+enfant.prenom+'</span></div>'+
    (!Object.keys(pm).length?'<div class="alert alert-info">Aucune note.</div>':
    '<div class="dashboard-grid">'+Object.entries(pm).map(function(kv){var mat=kv[0],ns=kv[1].ns,col=kv[1].c;var tc=ns.reduce(function(s,n){return s+n.coefficient;},0);var moy=tc>0?ns.reduce(function(s,n){return s+(n.valeur/n.sur*20*n.coefficient);},0)/tc:0;return '<div class="card"><div class="card-header"><div class="card-title" style="color:'+col+'">'+mat+'</div><span class="note-value '+noteColor(moy)+'">'+moy.toFixed(2)+'/20</span></div><div class="table-container"><table><thead><tr><th>Note</th><th>Intitulé</th><th>Date</th></tr></thead><tbody>'+ns.map(function(n){return '<tr><td><span class="note-value '+noteColor(n.valeur,n.sur)+'">'+n.valeur+'/'+n.sur+'</span></td><td>'+(n.intitule||'-')+'</td><td>'+fmt(n.date)+'</td></tr>';}).join('')+'</tbody></table></div></div>';}).join('')+'</div>');
});

registerPage('parentSanctions', async function() {
  var el=document.getElementById('page-parentSanctions');
  var enfant=await getEnfant();if(!enfant){el.innerHTML='<div class="alert alert-warning">Aucun enfant lié.</div>';return;}
  var r=await db.sanctions({eleve_id:enfant.id});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Retenues de '+enfant.prenom+'</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">⚠️ Retenues & sanctions de '+enfant.prenom+'</div></div>'+
    ((r.data||[]).length?'<div class="table-container"><table><thead><tr><th>Type</th><th>Motif</th><th>Date</th><th>Statut</th></tr></thead><tbody>'+(r.data||[]).map(function(s){var tc=SANCTION_COLORS[s.type]||'#546E7A';var sc={en_attente:'badge-orange',validee:'badge-vert',refusee:'badge-rouge'}[s.statut]||'badge-gris';return '<tr><td><span style="background:'+tc+';color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'+s.type+'</span></td><td style="font-size:12.5px">'+(s.motif||'').substring(0,100)+'</td><td>'+fmt(s.date)+'</td><td><span class="badge '+sc+'">'+s.statut+'</span></td></tr>';}).join('')+'</tbody></table></div>':
    '<div style="padding:20px;text-align:center;color:#90A4AE">Aucune sanction.</div>')+'</div>';
});

registerPage('parentJustifier', async function() {
  var el=document.getElementById('page-parentJustifier');
  var enfant=await getEnfant();if(!enfant){el.innerHTML='<div class="alert alert-warning">Aucun enfant lié.</div>';return;}
  var ra=await db.absences({eleve_id:enfant.id});
  var nonJust=(ra.data||[]).filter(function(a){return !a.justifiee;});
  var rdj=await supa.from('demandes_justification').select('*').eq('eleve_id',enfant.id).order('creee_le',{ascending:false});
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Justifier une absence</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">✅ Demande de justification pour '+enfant.prenom+'</div></div>'+
    '<div class="card-body">'+
      '<div class="alert alert-info">Votre demande sera examinée par la Vie Scolaire. Vous serez notifié de la décision.</div>'+
      (nonJust.length?
        '<div class="form-group"><label class="form-label">Absence à justifier *</label><select class="form-control" id="jus-abs"><option value="">-- Choisir --</option>'+nonJust.map(function(a){return '<option value="'+a.id+'">'+fmt(a.date)+' — '+a.type+'</option>';}).join('')+'</select></div>'+
        '<div class="form-group"><label class="form-label">Motif / justificatif *</label><textarea class="form-control" id="jus-motif" rows="4" placeholder="Expliquez la raison de l\'absence…"></textarea></div>'+
        '<button class="btn btn-primary" onclick="parentSoumettre(\''+enfant.id+'\')">📨 Soumettre</button>':
        '<div class="alert alert-success">✅ Toutes les absences sont déjà justifiées !</div>')+
    '</div></div>'+
    (rdj.data&&rdj.data.length?'<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">📋 Historique des demandes</div></div>'+rdj.data.map(function(d){var sc={en_attente:'badge-orange',acceptee:'badge-vert',refusee:'badge-rouge'}[d.statut]||'badge-gris';return '<div style="padding:12px 16px;border-bottom:1px solid var(--gris-border)"><div style="display:flex;justify-content:space-between"><span style="font-weight:600">'+fmt(d.date_absence)+' — '+d.motif_demande+'</span><span class="badge '+sc+'">'+d.statut+'</span></div>'+(d.reponse_admin?'<div style="font-size:12.5px;color:#546E7A;margin-top:4px">Réponse admin : '+d.reponse_admin+'</div>':'')+'</div>';}).join('')+'</div>':'');
});

async function parentSoumettre(enfantId){
  var absId=g('jus-abs'),motif=document.getElementById('jus-motif').value.trim();
  if(!absId){showToast('Sélectionnez une absence','warning');return;}
  if(!motif||motif.length<10){showToast('Motif trop court','warning');return;}
  var ra=await supa.from('absences').select('date').eq('id',absId).maybeSingle();
  var r=await supa.from('demandes_justification').insert({eleve_id:enfantId,absence_id:absId,date_absence:ra.data?ra.data.date:today(),motif_demande:motif,parent_id:currentUser.id,statut:'en_attente'});
  if(r.error){showToast(r.error.message,'danger');return;}
  var admins=await supa.from('profiles').select('id').in('role',['moderateur','realisateur']).eq('actif',true);
  for(var i=0;i<(admins.data||[]).length;i++){
    await creerNotif(admins.data[i].id,'parent','👨‍👩‍👦 Demande justification parent',currentUser.prenom+' '+currentUser.nom+' demande à justifier une absence','absences');
  }
  showToast('Demande soumise !','success');navigate('parentJustifier');
}

// ── VALIDATION JUSTIFICATIONS (admin) ────────
registerPage('justifications', async function() {
  var el=document.getElementById('page-justifications');
  el.innerHTML='<div class="breadcrumb">M13 Studio <span>Demandes de justification</span></div>'+
    '<div class="card"><div class="card-header"><div class="card-title">✅ Demandes de justification en attente</div></div><div id="just-body"></div></div>';
  var r=await supa.from('demandes_justification').select('*,profiles!demandes_justification_eleve_id_fkey(nom,prenom,classes(nom))').eq('statut','en_attente').order('creee_le',{ascending:false});
  var data=r.data||[];
  if(!data.length){document.getElementById('just-body').innerHTML='<div style="padding:20px;text-align:center;color:#90A4AE">Aucune demande en attente.</div>';return;}
  document.getElementById('just-body').innerHTML=data.map(function(d){return '<div style="padding:16px;border-bottom:1px solid var(--gris-border)"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-weight:700;font-size:13.5px">'+(d.profiles?d.profiles.prenom+' '+d.profiles.nom:'?')+(d.profiles&&d.profiles.classes?' <span style="font-size:11px;color:#90A4AE">('+d.profiles.classes.nom+')</span>':'')+'</div><div style="font-size:12.5px;color:#546E7A;margin-top:4px">Absence du '+fmt(d.date_absence)+' — Motif : '+d.motif_demande+'</div><div style="font-size:11.5px;color:#90A4AE;margin-top:2px">Soumis le '+fmtDT(d.creee_le)+'</div></div></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-success btn-sm" onclick="validerJustif(\''+d.id+'\',\''+d.absence_id+'\',\''+d.eleve_id+'\')">✅ Accepter</button><button class="btn btn-danger btn-sm" onclick="refuserJustif(\''+d.id+'\',\''+d.eleve_id+'\')">❌ Refuser</button></div></div>';}).join('');
});

async function validerJustif(id,absId,eleveId){
  var reponse=prompt('Message pour l\'élève/parent (optionnel) :');
  await supa.from('demandes_justification').update({statut:'acceptee',reponse_admin:reponse||'Justification acceptée',traitee_par:currentUser.id,traitee_le:new Date().toISOString()}).eq('id',id);
  await supa.from('absences').update({justifiee:true}).eq('id',absId);
  await creerNotif(eleveId,'validation','✅ Justification acceptée','Votre demande de justification a été acceptée'+(reponse?' : '+reponse:''),'mesAbsences');
  showToast('Justification acceptée !','success');navigate('justifications');
}

async function refuserJustif(id,eleveId){
  var raison=prompt('Raison du refus (sera communiquée à l\'élève) :');
  if(raison===null)return;
  await supa.from('demandes_justification').update({statut:'refusee',reponse_admin:raison||'Refusée',traitee_par:currentUser.id,traitee_le:new Date().toISOString()}).eq('id',id);
  await creerNotif(eleveId,'absence','❌ Justification refusée','Votre demande a été refusée'+(raison?' : '+raison:''),'mesAbsences');
  showToast('Refusée.','warning');navigate('justifications');
}

// ── 31. POINT D'ENTRÉE ───────────────────────
function init() {
  // Vérifier que le CDN Supabase est bien chargé
  if(!window.supabase) {
    document.getElementById('login-error').textContent = 'Erreur : impossible de charger la bibliothèque Supabase. Vérifiez votre connexion internet.';
    document.getElementById('login-error').classList.remove('hidden');
    document.getElementById('login-screen').style.display='flex';
    document.getElementById('app').style.display='none';
    // Brancher quand même le bouton pour réessayer
    var btn=document.getElementById('btn-login');
    if(btn) btn.addEventListener('click', function(){ showLoginError('Supabase non chargé — rechargez la page.'); });
    return;
  }
  try { supa = window.supabase.createClient(SUPA_URL, SUPA_KEY); }
  catch(e) { console.error('Supabase init error:', e); return; }
  if(loadSession()) {
    if(currentRole==='acteur') {
      db.mesCoursEDT(currentUser.id).then(function(r){monsCours=r.data||[];initApp();});
    } else { initApp(); }
    return;
  }
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').style.display='none';
  var btn=document.getElementById('btn-login');
  if(btn) btn.addEventListener('click',login);
  ['login-ident','login-pwd'].forEach(function(id){
    var f=document.getElementById(id);
    if(f){f.addEventListener('keydown',function(e){if(e.key==='Enter')login();});f.addEventListener('input',clearLoginError);}
  });
  var ov=document.getElementById('generic-modal');
  if(ov) ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
}

document.addEventListener('DOMContentLoaded', init);

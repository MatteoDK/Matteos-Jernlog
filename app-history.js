"use strict";
/* =========================================================
   VIEW: HISTORY LIST (egne øvelser)
   ========================================================= */
function renderHistoryList(){
  state.viewUser = null;
  var ex = loadEx();
  var logs = loadLogs();
  var loggedIds = {};
  logs.forEach(function(l){loggedIds[l.exerciseId]=true;});

  var lastDateFor = {};
  var lastLoggedAtFor = {};
  ex.forEach(function(e){
    if(!loggedIds[e.id]) return;
    var sess = sessionsForExercise(e.id);
    lastDateFor[e.id] = sess.length ? sess[sess.length-1].date : "";
    var maxAt = 0;
    logs.forEach(function(l){ if(l.exerciseId===e.id && l.loggedAt && l.loggedAt>maxAt) maxAt = l.loggedAt; });
    lastLoggedAtFor[e.id] = maxAt;
  });
  ex = ex.slice().sort(function(a,b){
    var da = lastDateFor[a.id] || "";
    var db = lastDateFor[b.id] || "";
    if(da!==db) return da < db ? 1 : -1; // most recently logged first
    var ta = lastLoggedAtFor[a.id] || 0;
    var tb = lastLoggedAtFor[b.id] || 0;
    if(ta!==tb) return ta < tb ? 1 : -1; // same day: most recently logged (by time) first
    return a.name.localeCompare(b.name);
  });

  var html = '<h2 class="section">Historik/Statistik</h2>';
  html += '<div class="card"><div class="search-wrap"><input type="text" id="histSearch" placeholder="Søg efter øvelse..." autocomplete="off"></div></div>';
  html += '<div class="card" id="histList" style="padding:0;"></div>';
  main.innerHTML = html;

  function draw(filterQ){
    var q = (filterQ||"").toLowerCase();
    var list = ex.filter(function(e){ return loggedIds[e.id] && (!q || e.name.toLowerCase().indexOf(q)!==-1); });
    var box = document.getElementById("histList");
    if(list.length===0){
      box.innerHTML = '<div class="empty-state">Ingen loggede øvelser endnu'+(q?" for søgningen":"")+'.</div>';
      return;
    }
    var out = "";
    list.forEach(function(e){
      var sess = sessionsForExercise(e.id);
      var last = sess[sess.length-1];
      out += '<div class="list-row" data-id="'+e.id+'"><div><div class="name">'+escapeHtml(e.name)+'</div><div class="muted">Sidst logget: '+fmtDateDisplay(last.date)+'</div></div><div class="chev">›</div></div>';
    });
    box.innerHTML = out;
    box.querySelectorAll(".list-row").forEach(function(row){
      row.addEventListener("click", function(){
        goto("exerciseHistory", {selectedExerciseId: row.getAttribute("data-id"), viewUser: null, histBack:"history"});
      });
    });
  }
  draw("");
  document.getElementById("histSearch").addEventListener("input", function(e){ draw(e.target.value); });
}

/* =========================================================
   VIEW: EXERCISE HISTORY DETAIL
   (bruges både til egne øvelser og read-only til venners)
   ========================================================= */
function ctxData(){
  if(state.viewUser && friendCache && friendCache.userId===state.viewUser){
    return { ex: friendCache.ex, logs: friendCache.logs, readOnly: true, who: friendCache.username };
  }
  return { ex: memEx, logs: memLogs, readOnly: false, who: null };
}

function renderExerciseHistory(exId){
  var ctx = ctxData();
  var exObj = ctx.ex.find(function(e){return e.id===exId;});
  if(!exObj){ goto(ctx.readOnly ? "friendProfile" : "history"); return; }
  var sessions = sessionsForExercise(exId, null, ctx.logs);
  var best = allTimeBest(exId, ctx.logs);

  var backLabel = ctx.readOnly ? "‹ "+escapeHtml(ctx.who||"Profil") : (state.histBack==="exercises" ? "‹ Øvelser" : "‹ Historik");
  var html = '<div class="back-btn" id="backToHist">'+backLabel+'</div>';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
  html += '<h2 class="section" style="margin-top:0;margin-bottom:0;">'+escapeHtml(exObj.name)+'</h2>';
  if(!ctx.readOnly) html += '<button class="icon-btn" id="renameExHistBtn" style="font-size:16px;">✎</button>';
  html += '</div>';

  /* Se hvordan øvelsen udføres — færdige søgninger der åbner i browseren */
  var q = encodeURIComponent(exObj.name + " exercise form");
  var qi = encodeURIComponent(exObj.name + " exercise");
  html += '<div class="howto-row">';
  html += '<a class="howto-link" href="https://www.youtube.com/results?search_query='+q+'" target="_blank" rel="noopener">🎥 Se på YouTube</a>';
  html += '<a class="howto-link" href="https://www.google.com/search?tbm=isch&q='+qi+'" target="_blank" rel="noopener">🖼 Se billeder</a>';
  html += '</div>';

  function goBack(){
    if(ctx.readOnly) goto("friendProfile");
    else if(state.histBack==="exercises") goto("exercises");
    else goto("history");
  }

  if(sessions.length===0){
    html += '<div class="card"><div class="empty-state">Ingen log endnu for denne øvelse.</div></div>';
    main.innerHTML = html;
    document.getElementById("backToHist").addEventListener("click", goBack);
    var rbtn0 = document.getElementById("renameExHistBtn");
    if(rbtn0) rbtn0.addEventListener("click", function(){
      openEditExerciseModal(exId, function(){ renderExerciseHistory(exId); });
    });
    return;
  }

  html += '<div class="card"><div class="muted" style="font-weight:700;color:var(--text);margin-bottom:6px;">Udvikling</div>';
  html += renderGraphSVG(sessions, exObj.bodyweight);
  html += '</div>';

  var reversedIdx = [];
  for(var i=sessions.length-1;i>=0;i--) reversedIdx.push(i);

  html += '<div class="card">';
  reversedIdx.forEach(function(idx, k){
    var s = sessions[idx];
    var isPR = best && s.date===best.date && s.topScore===best.topScore;
    var trend = trendForSession(sessions, idx);
    var dateLabel = idx===0 ? ("Startvægt "+s.date.slice(0,4)) : fmtDateDisplay(s.date);
    html += '<div class="session-block">';
    html += '<div class="session-header"><span class="session-date">'+dateLabel+'</span>'+(isPR?"<span class=\"pr-badge\">"+ICON_MEDAL+"PR</span>":(trend?trendArrow(trend):''))+'</div>';
    s.sets.forEach(function(set){
      html += '<div class="set-line" data-logid="'+set.id+'">';
      if(set.skipped){
        html += '<div><b class="muted">– ikke sporet</b> <span class="set-meta">(sæt '+set.setNumber+')</span></div>';
      } else {
        var wLabel;
        if(exObj.bodyweight){
          wLabel = set.weight ? ("Kropsvægt +"+set.weight+"kg") : "Kropsvægt";
        } else {
          wLabel = set.weight+" kg";
        }
        html += '<div><b>'+wLabel+'</b> × '+escapeHtml(set.repsLabel||String(set.reps))+' <span class="set-meta">(sæt '+set.setNumber+')</span></div>';
      }
      if(!ctx.readOnly){
        html += '<div class="set-actions"><button class="icon-btn edit" data-action="edit" data-logid="'+set.id+'">✎</button><button class="icon-btn del" data-action="del" data-logid="'+set.id+'">🗑</button></div>';
      }
      html += '</div>';
    });
    html += '</div>';
  });
  html += '</div>';

  main.innerHTML = html;
  document.getElementById("backToHist").addEventListener("click", goBack);
  var rbtn = document.getElementById("renameExHistBtn");
  if(rbtn) rbtn.addEventListener("click", function(){
    openEditExerciseModal(exId, function(){ renderExerciseHistory(exId); });
  });

  main.querySelectorAll('[data-action="del"]').forEach(function(btn){
    btn.addEventListener("click", function(){
      var logid = btn.getAttribute("data-logid");
      if(confirm("Slet dette sæt?")){
        var logs = loadLogs().filter(function(l){return l.id!==logid;});
        saveLogs(logs);
        renderExerciseHistory(exId);
      }
    });
  });
  main.querySelectorAll('[data-action="edit"]').forEach(function(btn){
    btn.addEventListener("click", function(){
      var logid = btn.getAttribute("data-logid");
      openEditSetModal(logid, exId);
    });
  });
}

function openEditSetModal(logId, exId){
  /* Vigtigt: dyb kopi af hver log — ellers muterer vi de objekter som
     cloud-sync'ens diff sammenligner med, og ændringen bliver aldrig gemt. */
  var logs = loadLogs().map(function(l){ return Object.assign({}, l); });
  var log = logs.find(function(l){return l.id===logId;});
  if(!log) return;
  var exObj = getExerciseById(exId);
  var weightVal = (log.weight===null||log.weight===undefined) ? "" : log.weight;
  var repsVal = log.skipped ? "" : (log.repsLabel!==undefined && log.repsLabel!==null ? log.repsLabel : (log.reps||""));
  var html = '<h3>Rediger sæt</h3>';
  if(log.skipped){ html += '<div class="muted" style="margin-bottom:12px;">Dette sæt er markeret som ikke sporet (–).</div>'; }
  html += '<div class="field"><label class="field-label">'+(exObj.bodyweight?"Ekstra vægt (kg)":"Vægt (kg)")+'</label><input type="text" inputmode="decimal" id="editWeight" value="'+weightVal+'"></div>';
  html += '<div class="field"><label class="field-label">Reps (enkelt tal eller interval, fx 7-9)</label><input type="text" id="editReps" value="'+escapeHtml(String(repsVal))+'"></div>';
  html += '<div class="row"><button class="btn ghost" id="skipEditBtn" style="border:1px solid var(--border);">Marker som sprunget over</button><button class="btn primary" id="saveEditBtn">Gem ændringer</button></div>';
  openModal(html);
  document.getElementById("skipEditBtn").addEventListener("click", function(){
    log.skipped = true;
    log.weight = null;
    log.reps = null;
    log.repsLabel = "–";
    saveLogs(logs);
    closeModal();
    renderExerciseHistory(exId);
    showToast("Sæt markeret som sprunget over");
  });
  bindTapAction(document.getElementById("saveEditBtn"), function(){
    var w = parseWeight(document.getElementById("editWeight").value);
    var parsedReps = parseReps(document.getElementById("editReps").value);
    if(!parsedReps){ showToast("Udfyld reps (fx 8 eller 7-9)"); return; }
    log.skipped = false;
    log.weight = exObj.bodyweight ? (w===null?0:w) : (w===null? log.weight : w);
    log.reps = parsedReps.reps;
    log.repsLabel = parsedReps.repsLabel;
    saveLogs(logs);
    closeModal();
    renderExerciseHistory(exId);
    showToast("Sæt opdateret");
  });
}

function renderGraphSVG(sessionsAll, bodyweight){
  var sessions = sessionsAll.filter(function(s){ return s.topSet!==null; });
  if(sessions.length===0){
    return '<div class="empty-state">Ingen sporede sæt endnu til graf.</div>';
  }
  var w = 480, h = 160, padL=34, padR=14, padT=16, padB=26;
  var values = sessions.map(function(s){
    return bodyweight ? s.topSet.reps : (s.topSet.weight||0);
  });
  var maxV = Math.max.apply(null, values);
  var minV = Math.min.apply(null, values);
  if(maxV===minV){ maxV = maxV+1; minV = Math.max(0,minV-1); }
  var n = sessions.length;
  function x(i){ return n<=1 ? padL : padL + (i*(w-padL-padR)/(n-1)); }
  function y(v){ return padT + (h-padT-padB) * (1 - (v-minV)/(maxV-minV)); }

  var points = values.map(function(v,i){ return x(i)+","+y(v); }).join(" ");
  var circles = "";
  values.forEach(function(v,i){
    circles += '<circle cx="'+x(i)+'" cy="'+y(v)+'" r="4" fill="var(--yellow)" stroke="#101012" stroke-width="1.5"></circle>';
  });
  var labelUnit = bodyweight ? " reps" : " kg";
  var svg = '<svg class="graph" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">';
  svg += '<line x1="'+padL+'" y1="'+(h-padB)+'" x2="'+(w-padR)+'" y2="'+(h-padB)+'" stroke="#2e2e33" stroke-width="1"/>';
  svg += '<text x="4" y="'+(y(maxV)+4)+'" fill="#9a9aa2" font-size="10">'+Math.round(maxV)+labelUnit+'</text>';
  svg += '<text x="4" y="'+(y(minV)+4)+'" fill="#9a9aa2" font-size="10">'+Math.round(minV)+labelUnit+'</text>';
  svg += '<polyline points="'+points+'" fill="none" stroke="#f5c518" stroke-width="2.5"/>';
  svg += circles;
  svg += '</svg>';
  return svg;
}


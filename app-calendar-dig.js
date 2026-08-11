"use strict";
/* =========================================================
   KALENDER-HJÆLPERE
   ========================================================= */
var MONTH_NAMES = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function trainedDateSet(logs){
  var set = {};
  logs.forEach(function(l){ if(l.date) set[l.date] = true; });
  return set;
}
function pad2(n){ return (n<10?"0":"")+n; }
function isoOf(y,m,d){ return y+"-"+pad2(m+1)+"-"+pad2(d); }

function streakStats(trainedSet){
  var dates = Object.keys(trainedSet).sort();
  var best = 0, cur = 0, prevMs = null;
  var DAY = 86400000;
  dates.forEach(function(d){
    var ms = Date.parse(d+"T00:00:00Z");
    if(prevMs!==null && ms - prevMs === DAY) cur += 1;
    else cur = 1;
    if(cur>best) best = cur;
    prevMs = ms;
  });
  /* nuværende streak: dage i træk til og med i dag (eller i går, hvis dagens træning ikke er logget endnu) */
  var current = 0;
  var t = Date.parse(todayISO()+"T00:00:00Z");
  if(!trainedSet[todayISO()]) t -= DAY;
  while(trainedSet[new Date(t).toISOString().slice(0,10)]){
    current += 1;
    t -= DAY;
  }
  return { best: best, current: current };
}

function calendarGridHtml(y, m, trainedSet){
  var first = new Date(Date.UTC(y, m, 1));
  var startBlank = (first.getUTCDay()+6)%7; /* mandag først */
  var daysInMonth = new Date(Date.UTC(y, m+1, 0)).getUTCDate();
  var today = todayISO();
  var html = '<div class="cal-grid">';
  ["M","T","O","T","F","L","S"].forEach(function(d){ html += '<div class="cal-dow">'+d+'</div>'; });
  for(var i=0;i<startBlank;i++) html += '<div class="cal-day out"></div>';
  for(var d=1;d<=daysInMonth;d++){
    var iso = isoOf(y,m,d);
    var cls = "cal-day";
    if(trainedSet[iso]) cls += " trained";
    if(iso===today) cls += " today";
    html += '<div class="'+cls+'"'+(trainedSet[iso]?' data-caldate="'+iso+'"':'')+'>'+d+'</div>';
  }
  html += '</div>';
  return html;
}
function monthTrainedCount(trainedSet, y, m){
  var prefix = y+"-"+pad2(m+1);
  return Object.keys(trainedSet).filter(function(d){ return d.indexOf(prefix)===0; }).length;
}

/* Detaljer for én dag: hvad blev der logget */
function dayDetailHtml(dateIso, logs, exList){
  var dayLogs = logs.filter(function(l){ return l.date===dateIso; });
  if(dayLogs.length===0) return "";
  var byEx = {}, order = [];
  dayLogs.forEach(function(l){
    if(!byEx[l.exerciseId]){ byEx[l.exerciseId]=[]; order.push(l.exerciseId); }
    byEx[l.exerciseId].push(l);
  });
  var html = '<div class="card"><div style="font-weight:800;margin-bottom:8px;">'+fmtDateDisplay(dateIso)+'</div>';
  order.forEach(function(exId){
    var e = exList.find(function(x){ return x.id===exId; }) || {name:"(slettet øvelse)", bodyweight:false};
    var sets = byEx[exId].slice().sort(function(a,b){ return (a.setNumber||0)-(b.setNumber||0); });
    var tracked = sets.filter(function(s){ return !s.skipped; });
    var setsTxt = tracked.length ? tracked.map(function(s){ return formatSetShort(s, e.bodyweight); }).join(", ") : "sprunget over";
    html += '<div class="feed-ex-line"><div class="feed-ex-name">'+escapeHtml(e.name)+'</div><div class="feed-ex-sets">'+escapeHtml(setsTxt)+'</div></div>';
  });
  html += '</div>';
  return html;
}

/* =========================================================
   VIEW: KALENDER (egen)
   ========================================================= */
function renderCalendarPage(){
  state.viewUser = null;
  if(!state.calMonth){ var n = new Date(); state.calMonth = {y: n.getFullYear(), m: n.getMonth()}; }
  var y = state.calMonth.y, m = state.calMonth.m;
  var logs = loadLogs();
  var trainedSet = trainedDateSet(logs);
  var streaks = streakStats(trainedSet);
  var workouts = groupWorkouts(logs);
  var total = workouts.length;
  var avg = "0";
  if(workouts.length){
    var firstMs = workouts[0].start;
    var weeks = Math.max(1, (Date.now()-firstMs)/(7*86400000));
    avg = (total/weeks).toFixed(1).replace(".", ",");
  }
  var monthCount = monthTrainedCount(trainedSet, y, m);

  var html = '<h2 class="section">Kalender</h2>';
  html += '<div class="card">';
  html += '<div class="cal-head"><div><div class="cal-title">'+MONTH_NAMES[m]+' '+y+'</div><div class="cal-sub">'+monthCount+' dag'+(monthCount===1?'':'e')+' trænet denne måned</div></div>';
  html += '<div class="cal-nav"><button id="calPrev">‹</button><button id="calNext">›</button></div></div>';
  html += calendarGridHtml(y, m, trainedSet);
  html += '<div class="muted" style="margin-top:8px;">Tryk på en gul dag for at se hvad du loggede.</div>';
  html += '</div>';

  html += '<div class="stat-grid">';
  html += '<div class="stat-box"><div class="stat-num">'+streaks.best+'</div><div class="stat-label">FLEST DAGE I TRÆK</div></div>';
  html += '<div class="stat-box"><div class="stat-num">'+streaks.current+'</div><div class="stat-label">NUVÆRENDE STREAK</div></div>';
  html += '<div class="stat-box"><div class="stat-num">'+total+'</div><div class="stat-label">TRÆNINGER I ALT</div></div>';
  html += '<div class="stat-box"><div class="stat-num">'+avg+'</div><div class="stat-label">TRÆNINGER PR. UGE</div></div>';
  html += '</div>';

  if(state.calSelectedDay){
    html += dayDetailHtml(state.calSelectedDay, logs, loadEx());
  }

  html += '<h2 class="section">Venner denne måned</h2>';
  html += '<div class="card" style="padding:0;" id="calFriends"><div class="empty-state">Henter…</div></div>';

  main.innerHTML = html;

  document.getElementById("calPrev").addEventListener("click", function(){
    state.calSelectedDay = null;
    state.calMonth = m===0 ? {y:y-1, m:11} : {y:y, m:m-1};
    renderCalendarPage();
  });
  document.getElementById("calNext").addEventListener("click", function(){
    state.calSelectedDay = null;
    state.calMonth = m===11 ? {y:y+1, m:0} : {y:y, m:m+1};
    renderCalendarPage();
  });
  main.querySelectorAll("[data-caldate]").forEach(function(cell){
    cell.addEventListener("click", function(){
      state.calSelectedDay = cell.getAttribute("data-caldate");
      renderCalendarPage();
    });
  });

  /* Venners måneds-statistik */
  getAcceptedFriendIds().then(function(friendIds){
    var box = document.getElementById("calFriends");
    if(!box) return;
    if(friendIds.length===0){ box.innerHTML = '<div class="empty-state">Ingen venner endnu.</div>'; return null; }
    return Promise.all([
      sb.from("profiles").select("*").in("id", friendIds),
      fetchAllRows(function(){ return sb.from("logs").select("*").in("user_id", friendIds).order("id"); })
    ]).then(function(res){
      var box2 = document.getElementById("calFriends");
      if(!box2) return;
      if(res[0].error) throw res[0].error;
      var nameById = {}; (res[0].data||[]).forEach(function(p){ nameById[p.id]=p.username; });
      var logsByUser = {};
      res[1].forEach(function(r){
        if(!logsByUser[r.user_id]) logsByUser[r.user_id]=[];
        logsByUser[r.user_id].push(rowToLog(r));
      });
      var out = "";
      friendIds.forEach(function(fid){
        var fset = trainedDateSet(logsByUser[fid]||[]);
        var fCount = monthTrainedCount(fset, y, m);
        var fStreak = streakStats(fset);
        out += '<div class="list-row" data-gotouser="'+fid+'"><div><div class="name">'+escapeHtml(nameById[fid]||"ukendt")+'</div><div class="muted">Bedste streak: '+fStreak.best+' dage i træk</div></div><div class="trend up" style="font-weight:800;">'+fCount+' dage</div></div>';
      });
      box2.innerHTML = out;
      box2.querySelectorAll("[data-gotouser]").forEach(function(row){
        row.addEventListener("click", function(){
          goto("friendProfile", {viewUser: row.getAttribute("data-gotouser")});
        });
      });
    });
  }).catch(function(){
    var box = document.getElementById("calFriends");
    if(box) box.innerHTML = '<div class="empty-state">Kunne ikke hente venners data.</div>';
  });
}

/* =========================================================
   VIEW: WINS & PLATEAUS
   ========================================================= */
function computeProgressRanking(){
  var exList = loadEx();
  var results = [];
  exList.forEach(function(ex){
    var sessions = sessionsForExercise(ex.id).filter(function(s){ return s.topScore!==null; });
    var n = sessions.length;
    if(n<2) return; // brug for mindst 2 træningsgange for at kunne sammenligne
    var windowSessions = sessions.slice(Math.max(0, n-10));
    var wn = windowSessions.length;
    var groupSize = Math.max(1, Math.min(3, Math.floor(wn/2)));
    var earlyGroup = windowSessions.slice(0, groupSize);
    var lateGroup = windowSessions.slice(wn-groupSize);
    var earlyAvg = earlyGroup.reduce(function(sum,s){return sum+s.topScore;},0) / earlyGroup.length;
    var lateAvg = lateGroup.reduce(function(sum,s){return sum+s.topScore;},0) / lateGroup.length;
    var pct = earlyAvg>0 ? ((lateAvg-earlyAvg)/earlyAvg)*100 : 0;
    results.push({
      exerciseId: ex.id,
      name: ex.name,
      bodyweight: ex.bodyweight,
      pct: pct,
      earlyTopSet: earlyGroup[earlyGroup.length-1].topSet,
      lateTopSet: lateGroup[lateGroup.length-1].topSet,
      sessionsUsed: wn
    });
  });
  var sorted = results.slice().sort(function(a,b){ return b.pct-a.pct; });
  var wins = sorted.slice(0,5);
  var plateaus = sorted.slice().sort(function(a,b){ return a.pct-b.pct; }).slice(0,5);
  return { wins: wins, plateaus: plateaus };
}

function formatSetShort(set, bodyweight){
  if(bodyweight){
    return (set.weight? ("+"+set.weight+"kg") : "kropsvægt")+"×"+(set.repsLabel||set.reps);
  }
  return set.weight+"kg×"+(set.repsLabel||set.reps);
}

function renderRankingRow(item){
  var sign = item.pct>0 ? "+" : "";
  var colorClass = item.pct > 2 ? "up" : (item.pct < -2 ? "down" : "same");
  var html = '<div class="list-row" data-exid="'+item.exerciseId+'" style="cursor:pointer;">';
  html += '<div><div class="name">'+escapeHtml(item.name)+'</div>';
  html += '<div class="muted">'+formatSetShort(item.earlyTopSet, item.bodyweight)+' → '+formatSetShort(item.lateTopSet, item.bodyweight)+' · '+item.sessionsUsed+' gange</div>';
  html += '</div><div class="trend '+colorClass+'" style="font-weight:800;">'+sign+item.pct.toFixed(0)+'%</div>';
  html += '</div>';
  return html;
}

function renderDig(){
  state.viewUser = null;
  var me = session.user.id;
  var exByIdMine = {};
  memEx.forEach(function(e){ exByIdMine[e.id] = e; });
  var workouts = buildUserWorkouts(me, memLogs, exByIdMine);
  workouts.sort(function(a,b){ return b.start-a.start; });
  workouts = workouts.slice(0, 15);

  var html = '<h2 class="section" style="margin-top:0;">Dig</h2>';

  html += '<h2 class="section" style="margin-top:0;">Seneste aktiviteter</h2>';
  var visibleCount = state.digShowAll ? workouts.length : Math.min(2, workouts.length);
  var visibleWorkouts = workouts.slice(0, visibleCount);
  if(workouts.length===0){
    html += '<div class="card"><div class="empty-state">Ingen træninger endnu. Log din første øvelse! 🏋️</div></div>';
  } else {
    visibleWorkouts.forEach(function(w, wi){
      var isLive = (Date.now() - w.end) < WORKOUT_GAP_MS;
      var anyPR = w.exercises.some(function(x){ return x.isPR; });
      var muscles = [];
      w.exercises.forEach(function(x){
        var lbl = MUSCLE_LABELS[x.muscle];
        if(lbl && muscles.indexOf(lbl)===-1) muscles.push(lbl);
      });
      var prNames = w.exercises.filter(function(x){ return x.isPR; }).map(function(x){ return x.name; });
      var key = String(w.start);
      var expanded = !!state.digExpanded[key];

      html += '<div class="feed-card" data-dkey="'+key+'" style="cursor:pointer;'+(isLive?'border-color:var(--green);':'')+'">';
      html += '<div class="feed-head" style="margin-bottom:0;">';
      html += '<div style="min-width:0;flex:1;">';
      html += renderWhenHtml(w, isLive);
      html += '</div>';
      if(isLive) html += '<span class="live-badge"><span class="live-dot"></span>I gang nu</span>';
      else if(anyPR) html += "<span class=\"pr-badge\">"+ICON_MEDAL+"PR</span>";
      html += '</div>';

      if(muscles.length) html += '<div class="muted" style="margin-top:8px;">💪 '+escapeHtml(muscles.join(" · "))+'</div>';
      if(prNames.length) html += '<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--yellow);">🏆 PR i '+escapeHtml(prNames.join(", "))+'</div>';
      html += '<div class="muted" style="margin-top:6px;"><span class="dig-toggle-label" style="color:var(--yellow);font-weight:700;">'+(expanded?'Skjul øvelser & sæt ▲':'Se øvelser & sæt ▼')+'</span></div>';

      html += '<div class="feed-details" style="display:'+(expanded?'block':'none')+';margin-top:10px;border-top:1px solid var(--border);">';
      w.exercises.forEach(function(x){
        var setsTxt;
        if(x.tracked.length===0){
          setsTxt = "sprunget over";
        } else {
          setsTxt = x.tracked.map(function(s){ return formatSetShort(s, x.bodyweight); }).join(", ");
        }
        html += '<div class="feed-ex-line">';
        html += '<div class="feed-ex-name">'+escapeHtml(x.name)+(x.isPR?" <span class=\"pr-badge\" style=\"font-size:10px;padding:2px 6px;\">"+ICON_MEDAL_SM+"PR</span>":'')+'</div>';
        html += '<div class="feed-ex-sets">'+escapeHtml(setsTxt)+'</div>';
        html += '</div>';
      });
      html += '</div>'; /* /detaljer */

      /* kommentarer — indlæses asynkront lige efter render (se loadDigComments) */
      html += '<div class="feed-comments" id="digc_'+wi+'" style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">';
      html += "<div class=\"feed-comments-label\">"+ICON_COMMENT+"Kommentarer</div>";
      html += '<div class="muted" style="font-size:12px;">Henter…</div>';
      html += '</div>';
      html += '</div>'; /* /kort */
    });
    if(!state.digShowAll && workouts.length > visibleCount){
      html += '<button class="btn" id="digShowMoreBtn" style="margin-bottom:16px;">Se tidligere</button>';
    }
  }

  var ranking = computeProgressRanking();
  html += '<h2 class="section" style="display:flex;align-items:center;gap:6px;">'+ICON_MEDAL+'Størst fremgang</h2>';
  html += '<div class="muted" style="margin-bottom:16px;">Baseret på dine seneste træningsgange pr. øvelse (op til 10), sammenlignet først vs. sidst i vinduet.</div>';
  if(ranking.wins.length===0){
    html += '<div class="card"><div class="empty-state">Log en øvelse mindst 2 gange for at se fremgang her.</div></div>';
  } else {
    html += '<div class="card" style="padding:0;">';
    ranking.wins.forEach(function(item){ html += renderRankingRow(item); });
    html += '</div>';
  }

  html += '<h2 class="section" style="display:flex;align-items:center;gap:6px;">'+ICON_TREND_DOWN+'Mindst fremgang / stagneret</h2>';
  if(ranking.plateaus.length===0){
    html += '<div class="card"><div class="empty-state">Ingen data endnu.</div></div>';
  } else {
    html += '<div class="card" style="padding:0;">';
    ranking.plateaus.forEach(function(item){ html += renderRankingRow(item); });
    html += '</div>';
  }

  main.innerHTML = html;
  loadDigComments(visibleWorkouts, me);

  var showMoreBtn = document.getElementById("digShowMoreBtn");
  if(showMoreBtn){
    bindTapAction(showMoreBtn, function(){
      state.digShowAll = true;
      renderDig();
    });
  }

  main.querySelectorAll(".feed-card[data-dkey]").forEach(function(card){
    card.addEventListener("click", function(e){
      if(e.target && e.target.closest && e.target.closest("input, button, a")) return;
      var det = card.querySelector(".feed-details");
      var lbl = card.querySelector(".dig-toggle-label");
      if(!det) return;
      var isOpen = det.style.display !== "none";
      det.style.display = isOpen ? "none" : "block";
      if(lbl) lbl.textContent = isOpen ? "Se øvelser & sæt ▼" : "Skjul øvelser & sæt ▲";
      state.digExpanded[card.getAttribute("data-dkey")] = !isOpen;
    });
  });

  main.querySelectorAll("[data-exid]").forEach(function(row){
    row.addEventListener("click", function(){
      goto("exerciseHistory", {selectedExerciseId: row.getAttribute("data-exid"), viewUser: null, histBack:"history"});
    });
  });
}

/* Kommentarer på Dig-siden — indlæses async lige efter selve siden er tegnet
   (så "Seneste aktiviteter"/ranking ikke skal vente på en netværkstur), og
   fyldes ind i de tomme "digc_<i>"-beholdere pr. træningskort. Genbruger
   samme visning/adfærd som kommentarer i feedet. */
function loadDigComments(workouts, me){
  if(!workouts.length) return;
  Promise.all([
    sb.from("comments").select("*").eq("target_user", me).order("created_at", {ascending:true}).limit(1000),
    getAcceptedFriendIds()
  ]).then(function(res){
    var comRes = res[0], friendIds = res[1];
    if(comRes.error) return;
    var ids = [me].concat(friendIds);
    return sb.from("profiles").select("*").in("id", ids).then(function(profRes){
      var nameById = {};
      (profRes.data||[]).forEach(function(p){ nameById[p.id] = p.username; });
      var commentsByKey = {};
      (comRes.data||[]).forEach(function(c){
        var k = String(Date.parse(c.workout_start));
        if(!commentsByKey[k]) commentsByKey[k] = [];
        commentsByKey[k].push(c);
      });
      workouts.forEach(function(w, wi){
        var container = document.getElementById("digc_"+wi);
        if(!container) return;
        var comments = commentsByKey[String(w.start)] || [];
        var h = "<div class=\"feed-comments-label\">"+ICON_COMMENT+"Kommentarer</div>";
        if(comments.length){
          h += '<div style="margin-bottom:4px;">';
          comments.forEach(function(c){
            h += '<div class="comment-line"><span class="comment-author">'+escapeHtml(nameById[c.author]||"ukendt")+'</span><span class="comment-body">'+escapeHtml(c.body)+'</span><span class="comment-date">'+escapeHtml(fmtCommentDate(c.created_at))+'</span></div>';
          });
          h += '</div>';
        }
        h += '<div class="comment-input-row"><input type="text" id="dcin_'+wi+'" placeholder="Skriv en kommentar…" maxlength="500"><button class="comment-send" data-dwi="'+wi+'">Send</button></div>';
        container.innerHTML = h;
        var btn = container.querySelector(".comment-send");
        bindTapAction(btn, function(){
          var input = document.getElementById("dcin_"+wi);
          var body = (input.value||"").trim();
          if(!body) return;
          btn.disabled = true;
          sb.from("comments").insert({
            target_user: me,
            workout_start: workoutKeyISO(w),
            author: me,
            body: body
          }).then(function(res2){
            if(res2.error){ showToast("Kunne ikke sende kommentar"); btn.disabled=false; return; }
            loadDigComments(workouts, me);
          });
        });
      });
    });
  }).catch(function(){
    /* stille fejl — kommentar-boksene viser bare "Henter…" ved netværksfejl, ikke kritisk */
  });
}

/* ---------------- Utils ---------------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

/* =========================================================
   TRÆNINGS-GRUPPERING (30 min uden logs = træning slut)
   ========================================================= */
var WORKOUT_GAP_MS = 30*60*1000;

function effectiveTime(l){
  return (l.loggedAt!==null && l.loggedAt!==undefined) ? l.loggedAt : Date.parse(l.date+"T12:00:00Z");
}

/* Har jeg selv logget et sæt inden for de sidste 30 min? Bruges til at vælge
   standard-side ved appstart (Log øvelse hvis i gang, ellers Feed). */
function hasRecentOwnActivity(){
  if(!memLogs.length) return false;
  var latest = -Infinity;
  memLogs.forEach(function(l){ var t = effectiveTime(l); if(t>latest) latest = t; });
  return (Date.now() - latest) < WORKOUT_GAP_MS;
}

function groupWorkouts(logs){
  var sorted = logs.slice().sort(function(a,b){ return effectiveTime(a)-effectiveTime(b); });
  var workouts = [];
  var cur = null;
  sorted.forEach(function(l){
    var t = effectiveTime(l);
    if(!cur || t - cur.end > WORKOUT_GAP_MS){
      cur = { start:t, end:t, logs:[] };
      workouts.push(cur);
    }
    cur.logs.push(l);
    cur.end = t;
  });
  return workouts;
}

/* Byg feed-venlige workout-objekter for én bruger, inkl. PR-markering.
   PR = bedste sæt i træningen slår brugerens hidtil bedste for øvelsen (før træningen). */
function buildUserWorkouts(userId, userLogs, exById){
  var workouts = groupWorkouts(userLogs);
  var bestSoFar = {}; // exerciseId -> score
  var out = [];
  workouts.forEach(function(w){
    var byEx = {};
    var orderEx = [];
    w.logs.forEach(function(l){
      if(!byEx[l.exerciseId]){ byEx[l.exerciseId] = []; orderEx.push(l.exerciseId); }
      byEx[l.exerciseId].push(l);
    });
    var exSummaries = orderEx.map(function(exId){
      var sets = byEx[exId].slice().sort(function(a,b){ return (a.setNumber||0)-(b.setNumber||0); });
      var tracked = sets.filter(function(s){ return !s.skipped; });
      var topScore = tracked.length ? Math.max.apply(null, tracked.map(setScore)) : null;
      var prevBest = bestSoFar[exId];
      var isPR = topScore!==null && prevBest!==undefined && topScore > prevBest;
      if(topScore!==null && (prevBest===undefined || topScore > prevBest)) bestSoFar[exId] = topScore;
      var exObj = exById[exId] || { id:exId, name:"(slettet øvelse)", bodyweight:false, muscle:null };
      return { exId:exId, name:exObj.name, bodyweight:!!exObj.bodyweight, muscle:exObj.muscle||null, sets:sets, tracked:tracked, isPR:isPR };
    });
    out.push({ userId:userId, start:w.start, end:w.end, exercises:exSummaries, setCount:w.logs.length });
  });
  return out;
}

function workoutKeyISO(w){ return new Date(w.start).toISOString(); }


"use strict";
/* =========================================================
   VIEW: ADMIN-GODKENDELSE (kun MASTER MATTEOs konto)
   ========================================================= */
function renderAdminApprovals(){
  state.viewUser = null;
  if(!isAdminAccount()){
    main.innerHTML = '<h2 class="section">Godkend brugere</h2><div class="card"><div class="empty-state">Du har ikke adgang til denne side.</div></div>';
    return;
  }
  main.innerHTML = '<h2 class="section" style="margin-top:0;">Godkend brugere</h2><div class="empty-state">Henter…</div>';
  sb.from("profiles").select("*").order("created_at", {ascending:true}).then(function(res){
    if(res.error) throw res.error;
    var all = res.data||[];
    var pending = all.filter(function(p){ return p.approved===false; });
    var myEmail = (session.user.email||"").toLowerCase();

    var html = '<h2 class="section" style="margin-top:0;">Venter på godkendelse</h2>';
    html += '<div class="muted" style="margin-bottom:16px;">Nye brugere kan ikke bruge appen før du har accepteret dem her.</div>';
    if(pending.length===0){
      html += '<div class="card"><div class="empty-state">Ingen ventende ansøgninger.</div></div>';
    } else {
      html += '<div class="card" style="padding:0;">';
      pending.forEach(function(p){
        html += '<div class="list-row" data-pid="'+p.id+'">';
        html += '<div><div class="name">'+escapeHtml(p.username||"(intet brugernavn)")+'</div><div class="muted">'+escapeHtml(p.email||"")+'</div></div>';
        html += '<div style="display:flex;gap:6px;"><button class="btn small primary" data-approve="'+p.id+'">Accepter</button><button class="btn small danger" data-reject="'+p.id+'">Afvis</button></div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '<h2 class="section">Alle oprettede brugere ('+all.length+')</h2>';
    if(all.length===0){
      html += '<div class="card"><div class="empty-state">Ingen brugere endnu.</div></div>';
    } else {
      html += '<div class="card" style="padding:0;">';
      all.forEach(function(p){
        var isSelf = (p.email||"").toLowerCase()===myEmail;
        var statusTxt = p.approved ? '<span style="color:var(--green);font-weight:700;">Godkendt</span>' : '<span style="color:var(--red);font-weight:700;">Afventer</span>';
        var createdTxt = p.created_at ? fmtDateDisplay(String(p.created_at).slice(0,10)) : "";
        html += '<div class="list-row" data-uid="'+p.id+'">';
        html += '<div><div class="name">'+escapeHtml(p.username||"(intet brugernavn)")+(isSelf?' <span class="muted">(dig)</span>':'')+'</div><div class="muted">'+escapeHtml(p.email||"")+' · '+createdTxt+'</div></div>';
        html += '<div style="display:flex;align-items:center;gap:8px;">'+statusTxt;
        if(p.approved && !isSelf) html += '<button class="btn small danger" data-revoke="'+p.id+'">Fjern adgang</button>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    main.innerHTML = html;

    main.querySelectorAll("[data-approve]").forEach(function(btn){
      btn.addEventListener("click", function(){
        btn.disabled = true;
        sb.from("profiles").update({approved:true}).eq("id", btn.getAttribute("data-approve")).then(function(res2){
          if(res2.error){ showToast("Kunne ikke godkende: "+(res2.error.message||"")); btn.disabled=false; return; }
          showToast("Bruger godkendt ✓");
          refreshMenuBadges();
          renderAdminApprovals();
        });
      });
    });
    main.querySelectorAll("[data-reject]").forEach(function(btn){
      btn.addEventListener("click", function(){
        if(!confirm("Afvis denne ansøgning? Personen skal i så fald oprette sig igen.")) return;
        btn.disabled = true;
        sb.from("profiles").delete().eq("id", btn.getAttribute("data-reject")).then(function(res2){
          if(res2.error){ showToast("Kunne ikke afvise: "+(res2.error.message||"")); btn.disabled=false; return; }
          showToast("Ansøgning afvist");
          refreshMenuBadges();
          renderAdminApprovals();
        });
      });
    });
    main.querySelectorAll("[data-revoke]").forEach(function(btn){
      btn.addEventListener("click", function(){
        if(!confirm("Fjern denne brugers adgang? Personen skal godkendes igen for at kunne bruge appen.")) return;
        btn.disabled = true;
        sb.from("profiles").update({approved:false}).eq("id", btn.getAttribute("data-revoke")).then(function(res2){
          if(res2.error){ showToast("Kunne ikke fjerne adgang: "+(res2.error.message||"")); btn.disabled=false; return; }
          showToast("Adgang fjernet");
          refreshMenuBadges();
          renderAdminApprovals();
        });
      });
    });
  }).catch(function(err){
    main.innerHTML = '<h2 class="section">Godkend brugere</h2><div class="card"><div class="empty-state">Kunne ikke hente — tjek din internetforbindelse.</div></div>';
  });
}

/* =========================================================
   VIEW: VENNER
   ========================================================= */
function renderFriends(){
  state.viewUser = null;
  main.innerHTML = '<h2 class="section">Venner</h2><div class="empty-state">Henter…</div>';
  var me = session.user.id;
  sb.from("friendships").select("*").then(function(fres){
    if(fres.error) throw fres.error;
    var rows = fres.data||[];
    var otherIds = rows.map(function(f){ return f.requester===me ? f.addressee : f.requester; });
    var idsToName = [me].concat(otherIds);
    return sb.from("profiles").select("*").in("id", idsToName).then(function(pres){
      if(pres.error) throw pres.error;
      draw(rows, pres.data||[]);
    });
  }).catch(function(){
    main.innerHTML = '<h2 class="section">Venner</h2><div class="card"><div class="empty-state">Kunne ikke hente venner — tjek internet.</div></div>';
  });

  function draw(rows, profiles){
    var nameById = {};
    profiles.forEach(function(p){ nameById[p.id] = p.username; });
    var incoming = rows.filter(function(f){ return f.status==="pending" && f.addressee===me; });
    var outgoing = rows.filter(function(f){ return f.status==="pending" && f.requester===me; });
    var accepted = rows.filter(function(f){ return f.status==="accepted"; });

    var html = '<h2 class="section">Venner</h2>';

    /* Søg og tilføj */
    html += '<div class="card">';
    html += '<label class="field-label">Tilføj en ven (søg på brugernavn eller email)</label>';
    html += '<div class="row"><input type="text" id="friendSearch" autocomplete="off" autocapitalize="off" placeholder="fx anders eller anders@mail.dk"><button class="btn small primary" id="friendSearchBtn" style="flex:0 0 auto;">Søg</button></div>';
    html += '<div id="friendSearchResults"></div>';
    html += '</div>';

    if(incoming.length){
      html += '<h2 class="section">Anmodninger til dig</h2>';
      html += '<div class="card" style="padding:0;">';
      incoming.forEach(function(f){
        html += '<div class="list-row"><div class="name">'+escapeHtml(nameById[f.requester]||"ukendt")+'</div>';
        html += '<div style="display:flex;gap:8px;"><button class="pill-btn" data-accept="'+f.id+'">Acceptér</button><button class="pill-btn ghost" data-declinefr="'+f.id+'">Afvis</button></div></div>';
      });
      html += '</div>';
    }

    if(outgoing.length){
      html += '<h2 class="section">Sendte anmodninger</h2>';
      html += '<div class="card" style="padding:0;">';
      outgoing.forEach(function(f){
        html += '<div class="list-row"><div><div class="name">'+escapeHtml(nameById[f.addressee]||"ukendt")+'</div><div class="muted">Afventer svar…</div></div>';
        html += '<button class="pill-btn dim" data-declinefr="'+f.id+'">Fortryd</button></div>';
      });
      html += '</div>';
    }

    html += '<h2 class="section">Dine venner</h2>';
    if(accepted.length===0){
      html += '<div class="card"><div class="empty-state">Ingen venner endnu — søg efter et brugernavn ovenfor. 👆</div></div>';
    } else {
      html += '<div class="card" style="padding:0;">';
      accepted.forEach(function(f){
        var otherId = f.requester===me ? f.addressee : f.requester;
        html += '<div class="list-row"><div class="name" data-gotouser="'+otherId+'" style="cursor:pointer;flex:1;">'+escapeHtml(nameById[otherId]||"ukendt")+'</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;"><button class="pill-btn dim" data-declinefr="'+f.id+'">Fjern</button><span class="chev" data-gotouser="'+otherId+'">›</span></div></div>';
      });
      html += '</div>';
    }

    main.innerHTML = html;

    /* Søgning */
    function doFriendSearch(){
      var q = document.getElementById("friendSearch").value.trim().toLowerCase();
      var box = document.getElementById("friendSearchResults");
      if(q.length<2){ box.innerHTML = '<div class="muted" style="margin-top:8px;">Skriv mindst 2 tegn.</div>'; return; }
      box.innerHTML = '<div class="muted" style="margin-top:8px;">Søger…</div>';
      Promise.all([
        sb.from("profiles").select("*").ilike("username", "%"+q+"%").limit(10),
        sb.from("profiles").select("*").ilike("email", "%"+q+"%").limit(10)
      ]).then(function(results){
        if(results[0].error && results[1].error){ box.innerHTML = '<div class="muted" style="margin-top:8px;">Søgning fejlede.</div>'; return; }
        var seenIds = {};
        var hits = [];
        results.forEach(function(res){
          (res.data||[]).forEach(function(p){
            if(p.id===me || seenIds[p.id]) return;
            seenIds[p.id] = true;
            hits.push(p);
          });
        });
        if(hits.length===0){ box.innerHTML = '<div class="muted" style="margin-top:8px;">Ingen brugere fundet med "'+escapeHtml(q)+'".</div>'; return; }
        var out = '<div class="search-results">';
        hits.forEach(function(p){
          var rel = rows.find(function(f){ return (f.requester===me&&f.addressee===p.id)||(f.requester===p.id&&f.addressee===me); });
          var action;
          if(rel && rel.status==="accepted") action = '<span class="friend-status">✓ Venner</span>';
          else if(rel && rel.requester===me) action = '<span class="friend-status">Afventer…</span>';
          else if(rel) action = '<button class="pill-btn" data-accept="'+rel.id+'">Acceptér</button>';
          else action = '<button class="pill-btn" data-request="'+p.id+'">Anmod</button>';
          out += '<div class="search-result-item"><span>'+escapeHtml(p.username)+'</span>'+action+'</div>';
        });
        out += '</div>';
        box.innerHTML = out;
        attachFriendActions(box);
      });
    }
    bindTapAction(document.getElementById("friendSearchBtn"), doFriendSearch);
    document.getElementById("friendSearch").addEventListener("keydown", function(e){ if(e.key==="Enter") doFriendSearch(); });

    attachFriendActions(main);

    main.querySelectorAll("[data-gotouser]").forEach(function(el){
      el.addEventListener("click", function(){
        goto("friendProfile", {viewUser: el.getAttribute("data-gotouser")});
      });
    });

    function attachFriendActions(root){
      root.querySelectorAll("[data-request]").forEach(function(btn){
        btn.addEventListener("click", function(){
          btn.disabled = true;
          sb.from("friendships").insert({ requester: me, addressee: btn.getAttribute("data-request"), status:"pending" }).then(function(res){
            if(res.error){ showToast("Kunne ikke sende anmodning"); btn.disabled=false; return; }
            showToast("Anmodning sendt ✓");
            renderFriends();
          });
        });
      });
      root.querySelectorAll("[data-accept]").forEach(function(btn){
        btn.addEventListener("click", function(){
          btn.disabled = true;
          sb.from("friendships").update({ status:"accepted" }).eq("id", btn.getAttribute("data-accept")).then(function(res){
            if(res.error){ showToast("Kunne ikke acceptere"); btn.disabled=false; return; }
            showToast("I er nu venner! 🎉");
            renderFriends();
          });
        });
      });
      root.querySelectorAll("[data-declinefr]").forEach(function(btn){
        btn.addEventListener("click", function(){
          if(!confirm("Er du sikker?")) return;
          btn.disabled = true;
          sb.from("friendships").delete().eq("id", btn.getAttribute("data-declinefr")).then(function(res){
            if(res.error){ showToast("Handlingen fejlede"); btn.disabled=false; return; }
            renderFriends();
          });
        });
      });
    }
  }
}

/* =========================================================
   VIEW: VENNE-PROFIL (read-only)
   ========================================================= */
function renderFriendProfile(userId){
  if(!userId){ goto("friends"); return; }
  main.innerHTML = '<div class="empty-state" style="padding-top:60px;">Henter profil…</div>';
  Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("exercises").select("*").eq("user_id", userId),
    fetchAllRows(function(){ return sb.from("logs").select("*").eq("user_id", userId).order("id"); })
  ]).then(function(res){
    var prof = res[0], exRes = res[1], logRows = res[2];
    if(prof.error || !prof.data || exRes.error) throw (prof.error||exRes.error||new Error("no profile"));
    friendCache = {
      userId: userId,
      username: prof.data.username,
      ex: (exRes.data||[]).map(rowToEx),
      logs: logRows.map(rowToLog)
    };
    state.viewUser = userId;
    state.friendCalMonth = null;
    state.friendCalSelectedDay = null;
    draw();
  }).catch(function(){
    main.innerHTML = '<div class="card"><div class="empty-state">Kunne ikke hente profilen — er I stadig venner?</div></div>';
  });

  function draw(){
    var ex = friendCache.ex;
    var logs = friendCache.logs;
    var loggedIds = {};
    logs.forEach(function(l){ loggedIds[l.exerciseId]=true; });

    var workouts = groupWorkouts(logs);
    var lastDateFor = {};
    ex.forEach(function(e){
      if(!loggedIds[e.id]) return;
      var sess = sessionsForExercise(e.id, null, logs);
      lastDateFor[e.id] = sess.length ? sess[sess.length-1].date : "";
    });
    var list = ex.filter(function(e){ return loggedIds[e.id]; }).sort(function(a,b){
      var da = lastDateFor[a.id]||"", db = lastDateFor[b.id]||"";
      if(da!==db) return da<db ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    var html = '<div class="back-btn" id="backToFriends">‹ Venner</div>';
    html += '<div class="feed-head" style="margin-bottom:14px;">';
    html += '<div class="avatar" style="width:46px;height:46px;font-size:20px;flex-basis:46px;">'+escapeHtml((friendCache.username||"?").slice(0,1).toUpperCase())+'</div>';
    html += '<div><div style="font-weight:800;font-size:18px;">'+escapeHtml(friendCache.username)+'</div>';
    html += '<div class="muted">'+workouts.length+' træning'+(workouts.length===1?'':'er')+' · '+list.length+' øvelse'+(list.length===1?'':'r')+'</div></div>';
    html += '</div>';

    /* Vennens kalender + stats */
    if(!state.friendCalMonth){ var nnow = new Date(); state.friendCalMonth = {y: nnow.getFullYear(), m: nnow.getMonth()}; }
    var fy = state.friendCalMonth.y, fm = state.friendCalMonth.m;
    var fset = trainedDateSet(logs);
    var fstreaks = streakStats(fset);
    var fMonthCount = monthTrainedCount(fset, fy, fm);
    html += '<div class="card">';
    html += '<div class="cal-head"><div><div class="cal-title">'+MONTH_NAMES[fm]+' '+fy+'</div><div class="cal-sub">'+fMonthCount+' dag'+(fMonthCount===1?'':'e')+' trænet denne måned</div></div>';
    html += '<div class="cal-nav"><button id="fcalPrev">‹</button><button id="fcalNext">›</button></div></div>';
    html += calendarGridHtml(fy, fm, fset);
    html += '</div>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-box"><div class="stat-num">'+fstreaks.best+'</div><div class="stat-label">FLEST DAGE I TRÆK</div></div>';
    html += '<div class="stat-box"><div class="stat-num">'+workouts.length+'</div><div class="stat-label">TRÆNINGER I ALT</div></div>';
    html += '</div>';
    if(state.friendCalSelectedDay){
      html += dayDetailHtml(state.friendCalSelectedDay, logs, ex);
    }

    if(list.length===0){
      html += '<div class="card"><div class="empty-state">'+escapeHtml(friendCache.username)+' har ikke logget noget endnu.</div></div>';
    } else {
      html += '<h2 class="section">Øvelser & statistik</h2>';
      html += '<div class="card" style="padding:0;">';
      list.forEach(function(e){
        var best = allTimeBest(e.id, logs);
        var bestTxt = best && best.topSet ? (" · Bedste: "+formatSetShort(best.topSet, e.bodyweight)) : "";
        html += '<div class="list-row" data-id="'+e.id+'"><div><div class="name">'+escapeHtml(e.name)+'</div><div class="muted">Sidst: '+fmtDateDisplay(lastDateFor[e.id])+bestTxt+'</div></div><div class="chev">›</div></div>';
      });
      html += '</div>';
    }

    main.innerHTML = html;
    document.getElementById("backToFriends").addEventListener("click", function(){ state.viewUser=null; goto("friends"); });
    document.getElementById("fcalPrev").addEventListener("click", function(){
      state.friendCalSelectedDay = null;
      state.friendCalMonth = fm===0 ? {y:fy-1, m:11} : {y:fy, m:fm-1};
      draw();
      main.scrollTop = 0;
    });
    document.getElementById("fcalNext").addEventListener("click", function(){
      state.friendCalSelectedDay = null;
      state.friendCalMonth = fm===11 ? {y:fy+1, m:0} : {y:fy, m:fm+1};
      draw();
      main.scrollTop = 0;
    });
    main.querySelectorAll("[data-caldate]").forEach(function(cell){
      cell.addEventListener("click", function(){
        state.friendCalSelectedDay = cell.getAttribute("data-caldate");
        draw();
      });
    });
    main.querySelectorAll(".list-row[data-id]").forEach(function(row){
      row.addEventListener("click", function(){
        goto("exerciseHistory", {selectedExerciseId: row.getAttribute("data-id"), viewUser: friendCache.userId});
      });
    });
  }
}

/* =========================================================
   VIEW: KOMMENTARER (samtaler + svar + ulæst-markering)
   ========================================================= */
function renderCommentsPage(){
  state.viewUser = null;
  main.innerHTML = '<h2 class="section">Kommentarer</h2><div class="empty-state">Henter…</div>';
  var me = session.user.id;
  Promise.all([
    sb.from("comments").select("*").order("created_at", {ascending:true}).limit(1000),
    sb.from("profiles").select("*")
  ]).then(function(res){
    if(res[0].error) throw res[0].error;
    var all = res[0].data||[];
    var nameById = {};
    ((res[1] && res[1].data)||[]).forEach(function(p){ nameById[p.id] = p.username; });
    /* Notifikationsliste: andres kommentarer i mine samtaler, nyeste først */
    var notis = myConversationComments(all).filter(function(c){ return c.author!==me; });
    notis.sort(function(a,b){ return Date.parse(b.created_at) - Date.parse(a.created_at); });
    var seen = getCommentsSeen();

    var html = '<h2 class="section">Kommentarer</h2>';
    if(notis.length===0){
      html += '<div class="card"><div class="empty-state">Ingen notifikationer endnu.<br>Når nogen kommenterer dine træninger, dukker det op her. 💬</div></div>';
    } else {
      html += '<div class="muted" style="margin-bottom:12px;">Tryk på en notifikation for at åbne træningen i feedet.</div>';
    }
    notis.forEach(function(c, i){
      var isNew = Date.parse(c.created_at) > seen;
      var author = nameById[c.author] || "ukendt";
      var whoTxt;
      if(c.target_user===me) whoTxt = "din træning";
      else if(c.target_user===c.author) whoTxt = "sin egen træning";
      else whoTxt = escapeHtml(nameById[c.target_user]||"ukendt")+"s træning";
      var cMs = Date.parse(c.created_at);
      var when = fmtDateDisplay(new Date(cMs).toISOString().slice(0,10)) + " kl. " + fmtClock(cMs);
      html += '<div class="feed-card" data-noti="'+i+'" style="cursor:pointer;'+(isNew?'border-color:var(--yellow);':'')+'">';
      html += '<div class="feed-head" style="margin-bottom:4px;">';
      html += '<div class="avatar">'+escapeHtml(author.slice(0,1).toUpperCase())+'</div>';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="font-size:14px;"><b>'+escapeHtml(author)+'</b> kommenterede '+whoTxt+(isNew?'<span class="new-dot"></span>':'')+'</div>';
      html += '<div class="muted" style="margin-top:2px;">'+when+'</div>';
      html += '</div><span class="chev">›</span></div>';
      html += '<div style="font-size:14px;color:var(--text-dim);word-break:break-word;">"'+escapeHtml(c.body)+'"</div>';
      html += '</div>';
    });
    main.innerHTML = html;

    /* markér som læst nu hvor de er vist */
    setCommentsSeenNow();
    refreshMenuBadges();

    main.querySelectorAll("[data-noti]").forEach(function(card){
      card.addEventListener("click", function(){
        var c = notis[parseInt(card.getAttribute("data-noti"),10)];
        var key = c.target_user + "|" + Date.parse(c.workout_start);
        state.feedFocus = key;
        state.feedExpanded[key] = true;
        goto("feed");
      });
    });
  }).catch(function(){
    main.innerHTML = '<h2 class="section">Kommentarer</h2><div class="card"><div class="empty-state">Kunne ikke hente — tjek din internetforbindelse.</div></div>';
  });
}

/* ---------------- Luk tastatur ved tryk udenfor et felt ---------------- */
document.addEventListener("touchstart", function(e){
  var active = document.activeElement;
  if(!active) return;
  var activeTag = active.tagName;
  if(activeTag!=="INPUT" && activeTag!=="TEXTAREA" && activeTag!=="SELECT") return;
  var targetTag = e.target.tagName;
  if(targetTag==="INPUT" || targetTag==="TEXTAREA" || targetTag==="SELECT") return;
  active.blur();
}, {passive:true});
document.addEventListener("mousedown", function(e){
  var active = document.activeElement;
  if(!active) return;
  var activeTag = active.tagName;
  if(activeTag!=="INPUT" && activeTag!=="TEXTAREA" && activeTag!=="SELECT") return;
  var targetTag = e.target.tagName;
  if(targetTag==="INPUT" || targetTag==="TEXTAREA" || targetTag==="SELECT") return;
  active.blur();
});

/* ---------------- Init ---------------- */
function init(){
  if(!sb){
    main.innerHTML = '<div class="empty-state" style="padding-top:60px;">Kunne ikke oprette forbindelse til skyen.<br>Tjek din internetforbindelse og genindlæs appen.</div>';
    return;
  }
  sb.auth.onAuthStateChange(function(event, s){
    if(event==="SIGNED_OUT"){ session = null; }
    else if(s) session = s;
  });
  sb.auth.getSession().then(function(res){
    session = (res.data && res.data.session) || null;
    if(session) bootAfterLogin();
    else renderLogin("in");
  }).catch(function(){
    renderLogin("in");
  });
}
init();

/* Sørger for at telefonen altid henter nyeste version fremover (se sw.js) —
   uden denne registrering kan telefonen blive ved med at vise gammel, cachet kode. */
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(function(){});
}


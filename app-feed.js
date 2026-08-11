"use strict";
/* =========================================================
   VIEW: FEED
   ========================================================= */
function getAcceptedFriendIds(){
  var me = session.user.id;
  return sb.from("friendships").select("*").then(function(res){
    if(res.error) throw res.error;
    return (res.data||[]).filter(function(f){ return f.status==="accepted"; }).map(function(f){
      return f.requester===me ? f.addressee : f.requester;
    });
  });
}

function renderFeed(){
  state.viewUser = null;
  main.innerHTML = '<h2 class="section">Feed</h2><div class="empty-state">Henter feed…</div>';
  var me = session.user.id;
  getAcceptedFriendIds().then(function(friendIds){
    var ids = [me].concat(friendIds);
    return Promise.all([
      sb.from("profiles").select("*").in("id", ids),
      fetchAllRows(function(){ return sb.from("logs").select("*").in("user_id", ids).order("logged_at", {ascending:false}).order("id"); }),
      sb.from("exercises").select("*").in("user_id", ids),
      sb.from("comments").select("*").in("target_user", ids).order("created_at", {ascending:true}).limit(1000),
      Promise.resolve(friendIds)
    ]);
  }).then(function(res){
    var profs = res[0], logRows = res[1], exRows = res[2], comRows = res[3], friendIds = res[4];
    if(profs.error) throw profs.error;
    if(exRows.error) throw exRows.error;

    var nameById = {};
    (profs.data||[]).forEach(function(p){ nameById[p.id] = p.username; });

    var exByUser = {}; // userId -> {exId: exObj}
    (exRows.data||[]).forEach(function(r){
      if(!exByUser[r.user_id]) exByUser[r.user_id] = {};
      exByUser[r.user_id][r.id] = rowToEx(r);
    });

    var logsByUser = {};
    logRows.forEach(function(r){
      var l = rowToLog(r);
      if(!logsByUser[r.user_id]) logsByUser[r.user_id] = [];
      logsByUser[r.user_id].push(l);
    });

    var allWorkouts = [];
    Object.keys(logsByUser).forEach(function(uidKey){
      allWorkouts = allWorkouts.concat(buildUserWorkouts(uidKey, logsByUser[uidKey], exByUser[uidKey]||{}));
    });
    allWorkouts.sort(function(a,b){ return b.start-a.start; });
    allWorkouts = allWorkouts.slice(0, 30);

    var commentsByKey = {};
    ((comRows && comRows.data)||[]).forEach(function(c){
      var key = c.target_user + "|" + Date.parse(c.workout_start);
      if(!commentsByKey[key]) commentsByKey[key] = [];
      commentsByKey[key].push(c);
    });

    var html = '<h2 class="section">Feed</h2>';
    if(friendIds.length===0){
      html += '<div class="card"><div class="muted" style="line-height:1.5;">Du har ingen venner endnu — tilføj en under <b>Venner</b> i menuen, så I kan se hinandens træninger her.</div></div>';
    }
    if(allWorkouts.length===0){
      html += '<div class="card"><div class="empty-state">Ingen træninger endnu. Log din første øvelse! 🏋️</div></div>';
      main.innerHTML = html;
      return;
    }

    allWorkouts.forEach(function(w, wi){
      var uname = nameById[w.userId] || "ukendt";
      var isMe = w.userId===me;
      var isLive = (Date.now() - w.end) < WORKOUT_GAP_MS;
      var anyPR = w.exercises.some(function(x){ return x.isPR; });
      var key = w.userId + "|" + w.start;
      var comments = commentsByKey[key] || [];
      var expanded = !!state.feedExpanded[key];

      /* kompakt resumé: muskelgrupper + PR-øvelser */
      var muscles = [];
      w.exercises.forEach(function(x){
        var lbl = MUSCLE_LABELS[x.muscle];
        if(lbl && muscles.indexOf(lbl)===-1) muscles.push(lbl);
      });
      var prNames = w.exercises.filter(function(x){ return x.isPR; }).map(function(x){ return x.name; });

      html += '<div class="feed-card" data-wkey="'+wi+'" style="cursor:pointer;'+(isLive?'border-color:var(--green);':'')+'">';
      html += '<div class="feed-head">';
      html += '<div class="avatar">'+escapeHtml(uname.slice(0,1).toUpperCase())+'</div>';
      html += '<div style="min-width:0;flex:1;">';
      html += '<div class="feed-who"'+(isMe?'':' style="cursor:pointer;" data-gotouser="'+w.userId+'"')+'>'+escapeHtml(uname)+(isMe?' <span class="muted">(dig)</span>':'')+'</div>';
      html += renderWhenHtml(w, isLive);
      html += '</div>';
      if(isLive) html += '<span class="live-badge"><span class="live-dot"></span>I gang nu</span>';
      else if(anyPR) html += "<span class=\"pr-badge\">"+ICON_MEDAL+"PR</span>";
      html += '</div>';

      if(muscles.length) html += '<div class="muted" style="margin-top:8px;">💪 '+escapeHtml(muscles.join(" · "))+'</div>';
      if(prNames.length) html += '<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--yellow);">🏆 PR i '+escapeHtml(prNames.join(", "))+'</div>';
      html += '<div class="muted" style="margin-top:6px;"><span style="color:var(--yellow);font-weight:700;" id="fdl_'+wi+'">'+(expanded?'Skjul øvelser & sæt ▲':'Se øvelser & sæt ▼')+'</span></div>';

      /* øvelse/sæt-detaljer (foldet sammen som standard) */
      html += '<div class="feed-details" id="fd_'+wi+'" style="display:'+(expanded?'block':'none')+';margin-top:10px;border-top:1px solid var(--border);">';
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
      html += '</div>'; /* /øvelse-detaljer */

      /* kommentarer — altid synlige, uafhængigt af "se detaljer" */
      html += '<div class="feed-comments" style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">';
      html += "<div class=\"feed-comments-label\">"+ICON_COMMENT+"Kommentarer</div>";
      if(comments.length){
        html += '<div style="margin-bottom:4px;">';
        comments.forEach(function(c){
          html += '<div class="comment-line"><span class="comment-author">'+escapeHtml(nameById[c.author]||"ukendt")+'</span><span class="comment-body">'+escapeHtml(c.body)+'</span><span class="comment-date">'+escapeHtml(fmtCommentDate(c.created_at))+'</span></div>';
        });
        html += '</div>';
      }
      html += '<div class="comment-input-row"><input type="text" id="cin_'+wi+'" placeholder="Skriv en kommentar…" maxlength="500"><button class="comment-send" data-wi="'+wi+'">Send</button></div>';
      html += '</div>'; /* /kommentarer */
      html += '</div>'; /* /kort */
    });

    main.innerHTML = html;

    /* fold ud/ind ved tryk på kortet (men ikke på input, knapper og links) */
    main.querySelectorAll(".feed-card[data-wkey]").forEach(function(card){
      card.addEventListener("click", function(e){
        if(e.target && e.target.closest && e.target.closest("input, button, a, [data-gotouser]")) return;
        var wi2 = parseInt(card.getAttribute("data-wkey"),10);
        var w2 = allWorkouts[wi2];
        var key2 = w2.userId + "|" + w2.start;
        var det = document.getElementById("fd_"+wi2);
        var lbl = document.getElementById("fdl_"+wi2);
        var isOpen = det.style.display !== "none";
        det.style.display = isOpen ? "none" : "block";
        if(lbl) lbl.textContent = isOpen ? "Se øvelser & sæt ▼" : "Skjul øvelser & sæt ▲";
        state.feedExpanded[key2] = !isOpen;
      });
    });

    /* deep-link fra Kommentarer: fold den rigtige træning ud og scroll derhen */
    if(state.feedFocus){
      var focusIdx = -1;
      allWorkouts.forEach(function(w3, i3){ if((w3.userId+"|"+w3.start)===state.feedFocus) focusIdx = i3; });
      if(focusIdx>=0){
        state.feedExpanded[state.feedFocus] = true;
        var fdet = document.getElementById("fd_"+focusIdx);
        var flbl = document.getElementById("fdl_"+focusIdx);
        if(fdet) fdet.style.display = "block";
        if(flbl) flbl.textContent = "Skjul øvelser & sæt ▲";
        var fcard = main.querySelector('.feed-card[data-wkey="'+focusIdx+'"]');
        if(fcard){
          fcard.style.borderColor = "var(--yellow)";
          if(fcard.scrollIntoView) fcard.scrollIntoView({behavior:"smooth", block:"start"});
        }
      }
      state.feedFocus = null;
    }

    main.querySelectorAll("[data-gotouser]").forEach(function(el){
      el.addEventListener("click", function(){
        goto("friendProfile", {viewUser: el.getAttribute("data-gotouser")});
      });
    });
    main.querySelectorAll(".comment-send").forEach(function(btn){
      bindTapAction(btn, function(){
        var wi = parseInt(btn.getAttribute("data-wi"),10);
        var w = allWorkouts[wi];
        var input = document.getElementById("cin_"+wi);
        var body = (input.value||"").trim();
        if(!body) return;
        btn.disabled = true;
        sb.from("comments").insert({
          target_user: w.userId,
          workout_start: workoutKeyISO(w),
          author: me,
          body: body
        }).then(function(res){
          if(res.error){ showToast("Kunne ikke sende kommentar"); btn.disabled=false; return; }
          renderFeed();
        });
      });
    });
  }).catch(function(err){
    main.innerHTML = '<h2 class="section">Feed</h2><div class="card"><div class="empty-state">Kunne ikke hente feedet — tjek din internetforbindelse.</div></div>';
  });
}


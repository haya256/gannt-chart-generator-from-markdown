/* Gantt chart SVG renderer — vanilla JS, no dependencies */
(function () {
  'use strict';

  // ── Layout constants ───────────────────────────────────────────────────────
  const L = {
    LEFT_W: 230,
    DATE_COL_W: 90,
    ROW_H: 36,
    GROUP_H: 40,
    HEADER_H: 54,
    TITLE_H: 44,
    BAR_PAD: 7,
    BAR_R: 4,
    MS_SIZE: 8,
    // compact mode
    LANE_H: 26,
    LANE_BAR_H: 17,
    LANE_PAD: 6,
  };

  const PX_PER_DAY = { day: 24, week: 10, month: 3.8 };

  // ── Themes ─────────────────────────────────────────────────────────────────
  const THEMES = {
    blue: {
      groupBg: '#2c5282', groupFg: '#fff',
      taskBg: '#4299e1', taskFg: '#fff',
      msFill: '#e53e3e', msStroke: '#c53030',
      todayStroke: '#e53e3e',
      headerBg: '#edf2f7', headerFg: '#4a5568', headerBorder: '#cbd5e0',
      gridStroke: '#e2e8f0',
      rowBg: '#ffffff', rowBgAlt: '#f7fafc',
      leftBg: '#f7fafc', leftFg: '#2d3748', leftBorder: '#e2e8f0',
      depStroke: '#a0aec0',
      titleFg: '#1a202c', titleBg: '#edf2f7',
      svgBg: '#ffffff',
    },
    green: {
      groupBg: '#276749', groupFg: '#fff',
      taskBg: '#48bb78', taskFg: '#fff',
      msFill: '#dd6b20', msStroke: '#c05621',
      todayStroke: '#dd6b20',
      headerBg: '#f0fff4', headerFg: '#276749', headerBorder: '#c6f6d5',
      gridStroke: '#c6f6d5',
      rowBg: '#ffffff', rowBgAlt: '#f0fff4',
      leftBg: '#f0fff4', leftFg: '#22543d', leftBorder: '#c6f6d5',
      depStroke: '#9ae6b4',
      titleFg: '#1c4532', titleBg: '#f0fff4',
      svgBg: '#ffffff',
    },
    dark: {
      groupBg: '#1a202c', groupFg: '#e2e8f0',
      taskBg: '#4a5568', taskFg: '#e2e8f0',
      msFill: '#fc8181', msStroke: '#f56565',
      todayStroke: '#fc8181',
      headerBg: '#2d3748', headerFg: '#a0aec0', headerBorder: '#4a5568',
      gridStroke: '#4a5568',
      rowBg: '#1a202c', rowBgAlt: '#2d3748',
      leftBg: '#2d3748', leftFg: '#e2e8f0', leftBorder: '#4a5568',
      depStroke: '#718096',
      titleFg: '#f7fafc', titleBg: '#1a202c',
      svgBg: '#1a202c',
    },
    warm: {
      groupBg: '#744210', groupFg: '#fff',
      taskBg: '#ed8936', taskFg: '#fff',
      msFill: '#9b2c2c', msStroke: '#742a2a',
      todayStroke: '#9b2c2c',
      headerBg: '#fffaf0', headerFg: '#744210', headerBorder: '#fbd38d',
      gridStroke: '#fbd38d',
      rowBg: '#ffffff', rowBgAlt: '#fffaf0',
      leftBg: '#fffaf0', leftFg: '#4a2c0a', leftBorder: '#fbd38d',
      depStroke: '#f6ad55',
      titleFg: '#4a2c0a', titleBg: '#fffaf0',
      svgBg: '#ffffff',
    },
  };

  // ── Date utilities ─────────────────────────────────────────────────────────
  function parseDate(s) {
    if (!s) return null;
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function startOfWeek(d) {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return addDays(d, diff);
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function daysInMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  function formatDate(d, fmt) {
    const Y = d.getFullYear();
    const M = d.getMonth() + 1;
    const D = d.getDate();
    const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    switch (fmt) {
      case 'M/D':       return `${M}/${D}`;
      case 'MMM':       return MONTHS_EN[d.getMonth()];
      case 'MMM YY':    return `${MONTHS_EN[d.getMonth()]} '${String(Y).slice(2)}`;
      case 'YYYY/M':    return `${Y}/${M}`;
      case 'M月':       return `${M}月`;
      case 'M月D日':    return `${M}月${D}日`;
      default:          return `${Y}-${String(M).padStart(2,'0')}-${String(D).padStart(2,'0')}`;
    }
  }

  // ── SVG helpers ────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function a(obj) {
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}="${esc(v)}"`)
      .join(' ');
  }

  function el(tag, attrs, inner) {
    return inner !== undefined
      ? `<${tag} ${a(attrs)}>${inner}</${tag}>`
      : `<${tag} ${a(attrs)}/>`;
  }

  function txt(x, y, content, attrs) {
    return el('text', { x, y, ...attrs }, esc(content));
  }

  function rect(x, y, w, h, attrs) {
    return el('rect', { x, y, width: w, height: h, ...attrs });
  }

  function line(x1, y1, x2, y2, attrs) {
    return el('line', { x1, y1, x2, y2, ...attrs });
  }

  // ── Compact lane assignment ────────────────────────────────────────────────
  // Greedy interval scheduling: assign each task to the earliest available lane.
  function assignLanes(tasks) {
    var sorted = tasks.slice().sort(function (a, b) {
      if (!a._start || !b._start) return 0;
      return a._start.getTime() - b._start.getTime();
    });
    var laneEnds = []; // last _end date placed in each lane
    var assignments = [];
    sorted.forEach(function (t) {
      var lane = -1;
      for (var i = 0; i < laneEnds.length; i++) {
        if (!laneEnds[i] || !t._start || t._start >= laneEnds[i]) {
          lane = i;
          break;
        }
      }
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(null); }
      laneEnds[lane] = t._end || t._start;
      assignments.push({ task: t, lane: lane });
    });
    return { assignments: assignments, numLanes: Math.max(laneEnds.length, 1) };
  }

  function buildTip(name, start, end, note) {
    var parts = [name];
    if (start && end && start !== end) parts.push(start + ' 〜 ' + end);
    else if (start) parts.push(start);
    if (note) parts.push(note);
    return parts.join('\n');
  }

  // ── Main render function ───────────────────────────────────────────────────
  function render(spec, opts) {
    opts = opts || {};
    const theme = THEMES[opts.theme] || THEMES.blue;
    const unit = opts.unit || (spec.display && spec.display.unit) || 'week';
    const pxPerDay = opts.pxPerDay || PX_PER_DAY[unit] || PX_PER_DAY.week;
    var showDates  = !!opts.showDates;
    var leftTotalW = L.LEFT_W + (showDates ? L.DATE_COL_W : 0);

    // Group map
    const groupMap = {};
    (spec.groups || []).forEach(function (g) { groupMap[g.id] = g; });

    // Parse task/milestone dates
    const tasks = (spec.tasks || []).map(function (t) {
      return Object.assign({}, t, {
        _start: parseDate(t.start),
        _end: parseDate(t.end),
      });
    });
    const milestones = (spec.milestones || []).map(function (m) {
      return Object.assign({}, m, { _date: parseDate(m.date) });
    });

    // Display range
    var dispStart, dispEnd;
    if (spec.display && spec.display.start) {
      dispStart = parseDate(spec.display.start);
    } else {
      var starts = tasks.map(function (t) { return t._start; }).concat(milestones.map(function (m) { return m._date; })).filter(Boolean);
      dispStart = starts.length ? new Date(Math.min.apply(null, starts)) : new Date();
    }
    if (spec.display && spec.display.end) {
      dispEnd = parseDate(spec.display.end);
    } else {
      var ends = tasks.map(function (t) { return t._end; }).concat(milestones.map(function (m) { return m._date; })).filter(Boolean);
      dispEnd = ends.length ? new Date(Math.max.apply(null, ends)) : addDays(dispStart, 30);
    }

    // Always add padding so bars don't hit the edge, then snap
    var padDays = unit === 'day' ? 4 : unit === 'month' ? 31 : 7;
    dispStart = addDays(dispStart, -padDays);
    dispEnd   = addDays(dispEnd,   padDays);

    if (unit === 'week') dispStart = startOfWeek(dispStart);
    else if (unit === 'month') dispStart = startOfMonth(dispStart);

    var totalDays = daysBetween(dispStart, dispEnd);
    var chartW = Math.ceil(totalDays * pxPerDay);
    var svgW = leftTotalW + chartW;

    // Build rows
    var tasksByGroup = {};
    tasks.forEach(function (t) {
      var gid = t.group || '__none__';
      if (!tasksByGroup[gid]) tasksByGroup[gid] = [];
      tasksByGroup[gid].push(t);
    });
    var msByGroup = {};
    milestones.forEach(function (m) {
      var gid = m.group || '__none__';
      if (!msByGroup[gid]) msByGroup[gid] = [];
      msByGroup[gid].push(m);
    });

    var rows = [];
    var groupOrder = (spec.groups || []).map(function (g) { return g.id; }).concat(['__none__']);

    if (opts.compact) {
      // One row per group; tasks packed into lanes within the row.
      groupOrder.forEach(function (gid) {
        var gt = tasksByGroup[gid] || [];
        var gm = msByGroup[gid] || [];
        if (!gt.length && !gm.length) return;
        var lr = assignLanes(gt);
        var rh = Math.max(L.GROUP_H, L.LANE_PAD * 2 + lr.numLanes * L.LANE_H);
        rows.push({
          type: 'compact',
          data: gid !== '__none__' ? groupMap[gid] : null,
          gid: gid,
          assignments: lr.assignments,
          numLanes: lr.numLanes,
          milestones: gm,
          h: rh,
        });
      });
    } else {
      groupOrder.forEach(function (gid) {
        var gt = tasksByGroup[gid] || [];
        var gm = msByGroup[gid] || [];
        if (!gt.length && !gm.length) return;
        if (gid !== '__none__' && groupMap[gid]) {
          rows.push({ type: 'group', data: groupMap[gid] });
        }
        gt.forEach(function (t) { rows.push({ type: 'task', data: t }); });
        gm.forEach(function (m) { rows.push({ type: 'milestone', data: m }); });
      });
    }

    var rowsH = rows.reduce(function (s, r) {
      if (r.type === 'compact') return s + r.h;
      return s + (r.type === 'group' ? L.GROUP_H : L.ROW_H);
    }, 0);

    // Dynamic header height based on visible rows
    var HROW = 22;
    var showYear  = opts.showYear  !== false;
    var showMonth = opts.showMonth !== false;
    var showWeek  = opts.showWeek  !== false;
    var showDay   = opts.showDay   !== false;
    var showDow   = !!opts.showDow;
    var headerH = ((showYear ? 1 : 0) + (showMonth ? 1 : 0) + (showWeek ? 1 : 0) + (showDay ? 1 : 0) + (showDow ? 1 : 0)) * HROW || 4;

    var svgH = L.TITLE_H + headerH + rowsH;

    function xDate(d) {
      return leftTotalW + daysBetween(dispStart, d) * pxPerDay;
    }

    function shortDate(d) {
      return d ? (d.getMonth() + 1) + '/' + d.getDate() : '';
    }

    // ── SVG assembly ──────────────────────────────────────────────────────────
    var p = [];

    p.push('<svg xmlns="http://www.w3.org/2000/svg"'
      + ' width="' + svgW + '" height="' + svgH + '"'
      + ' font-family="\'Segoe UI\',\'Helvetica Neue\',Arial,sans-serif"'
      + ' style="display:block">');

    // Defs
    p.push('<defs>');
    p.push('<marker id="gantt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">'
      + '<path d="M0,0 L0,6 L8,3 z" fill="' + theme.depStroke + '"/></marker>');
    p.push('<clipPath id="gantt-chart">'
      + rect(leftTotalW, 0, chartW, svgH, {})
      + '</clipPath>');
    p.push('<clipPath id="gantt-left">'
      + rect(0, 0, L.LEFT_W - 1, svgH, {})
      + '</clipPath>');
    p.push('<clipPath id="gantt-date">'
      + rect(L.LEFT_W, 0, L.DATE_COL_W - 1, svgH, {})
      + '</clipPath>');
    p.push('</defs>');

    // Background
    p.push(rect(0, 0, svgW, svgH, { fill: theme.svgBg }));

    // ── Title bar ─────────────────────────────────────────────────────────────
    p.push(rect(0, 0, svgW, L.TITLE_H, { fill: theme.titleBg }));
    p.push(line(0, L.TITLE_H, svgW, L.TITLE_H, { stroke: theme.headerBorder, 'stroke-width': 1 }));
    p.push(txt(14, L.TITLE_H / 2, spec.title || 'Gantt Chart', {
      'font-size': 17, 'font-weight': 'bold', fill: theme.titleFg,
      'dominant-baseline': 'middle',
    }));
    if (spec.description) {
      p.push(txt(svgW - 14, L.TITLE_H / 2, spec.description, {
        'font-size': 11, fill: theme.headerFg,
        'text-anchor': 'end', 'dominant-baseline': 'middle',
      }));
    }

    // ── Timeline header (3 toggleable rows: year / month / day) ──────────────
    var hY = L.TITLE_H;
    p.push(rect(0, hY, svgW, headerH, { fill: theme.headerBg }));

    var hy = hY; // advances as each visible row is rendered

    // ── Row 1: Year ───────────────────────────────────────────────────────────
    if (showYear) {
      for (var yr = dispStart.getFullYear(); yr <= dispEnd.getFullYear(); yr++) {
        var ys = new Date(yr, 0, 1);
        var ye = new Date(yr + 1, 0, 1);
        var x1 = Math.max(xDate(ys), leftTotalW);
        var x2 = Math.min(xDate(ye), leftTotalW + chartW);
        var yw = x2 - x1;
        if (yw > 2) {
          p.push(rect(x1, hy, yw, HROW, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (yw > 24) {
            p.push(txt(x1 + yw / 2, hy + HROW / 2, String(yr) + '年', {
              'font-size': 11, 'font-weight': '600', fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
      }
      hy += HROW;
    }

    // ── Row 2: Month ──────────────────────────────────────────────────────────
    if (showMonth) {
      var mc = startOfMonth(dispStart);
      while (mc <= dispEnd) {
        var mn = new Date(mc.getFullYear(), mc.getMonth() + 1, 1);
        var x1 = Math.max(xDate(mc), leftTotalW);
        var x2 = Math.min(xDate(mn), leftTotalW + chartW);
        var mw = x2 - x1;
        if (mw > 2) {
          p.push(rect(x1, hy, mw, HROW, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (mw > 16) {
            var mlabel = formatDate(mc, 'M月');
            p.push(txt(x1 + mw / 2, hy + HROW / 2, mlabel, {
              'font-size': 10, fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
        mc = mn;
      }
      hy += HROW;
    }

    // ── Row 3: Week ───────────────────────────────────────────────────────────
    if (showWeek) {
      var ws = startOfWeek(dispStart);
      while (ws <= dispEnd) {
        var wx = xDate(ws);
        var ww = 7 * pxPerDay;
        var wcx1 = Math.max(wx, leftTotalW);
        var wcx2 = Math.min(wx + ww, leftTotalW + chartW);
        var wcw = wcx2 - wcx1;
        if (wcw > 2) {
          p.push(rect(wcx1, hy, wcw, HROW, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (wcw > 22) {
            p.push(txt(wcx1 + wcw / 2, hy + HROW / 2, formatDate(ws, 'M/D'), {
              'font-size': 10, fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
        ws = addDays(ws, 7);
      }
      hy += HROW;
    }

    // ── Row 4: Day ────────────────────────────────────────────────────────────
    if (showDay) {
      var dd = new Date(dispStart.getTime());
      while (dd <= dispEnd) {
        var ddx = xDate(dd);
        var dcx1 = Math.max(ddx, leftTotalW);
        var dcx2 = Math.min(ddx + pxPerDay, leftTotalW + chartW);
        var dcw = dcx2 - dcx1;
        if (dcw > 0) {
          p.push(rect(dcx1, hy, dcw, HROW, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (dcw > 10) {
            p.push(txt(dcx1 + dcw / 2, hy + HROW / 2, String(dd.getDate()), {
              'font-size': 9, fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
        dd = addDays(dd, 1);
      }
      hy += HROW;
    }

    // ── Row 5: 曜日 ───────────────────────────────────────────────────────────
    if (showDow) {
      var DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
      var dowd = new Date(dispStart.getTime());
      while (dowd <= dispEnd) {
        var dowx = xDate(dowd);
        var dowcx1 = Math.max(dowx, leftTotalW);
        var dowcx2 = Math.min(dowx + pxPerDay, leftTotalW + chartW);
        var dowcw = dowcx2 - dowcx1;
        if (dowcw > 0) {
          var dowIdx = dowd.getDay();
          var cellFill = dowIdx === 6 ? '#ebf8ff' : dowIdx === 0 ? '#fff5f5' : theme.headerBg;
          var cellFg   = dowIdx === 6 ? '#2b6cb0' : dowIdx === 0 ? '#c53030' : theme.headerFg;
          p.push(rect(dowcx1, hy, dowcw, HROW, { fill: cellFill, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (dowcw > 8) {
            p.push(txt(dowcx1 + dowcw / 2, hy + HROW / 2, DAYS_JA[dowIdx], {
              'font-size': 9, fill: cellFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
        dowd = addDays(dowd, 1);
      }
      hy += HROW;
    }

    // ── Grid lines ────────────────────────────────────────────────────────────
    var gridTop = L.TITLE_H + headerH;
    var gridBot = svgH;

    if (unit === 'week') {
      var gw = startOfWeek(dispStart);
      while (gw <= dispEnd) {
        var gx = xDate(gw);
        if (gx >= leftTotalW) {
          p.push(line(gx, gridTop, gx, gridBot, { stroke: theme.gridStroke, 'stroke-width': 1 }));
        }
        gw = addDays(gw, 7);
      }
    } else if (unit === 'month') {
      var gmc = startOfMonth(dispStart);
      while (gmc <= dispEnd) {
        var gmx = xDate(gmc);
        if (gmx >= leftTotalW) {
          p.push(line(gmx, gridTop, gmx, gridBot, { stroke: theme.gridStroke, 'stroke-width': 1 }));
        }
        gmc = new Date(gmc.getFullYear(), gmc.getMonth() + 1, 1);
      }
    } else {
      var gday = new Date(dispStart.getTime());
      while (gday <= dispEnd) {
        var gdx = xDate(gday);
        if (gdx >= leftTotalW) {
          p.push(line(gdx, gridTop, gdx, gridBot, { stroke: theme.gridStroke, 'stroke-width': 1 }));
        }
        gday = addDays(gday, 1);
      }
    }

    // ── Rows ──────────────────────────────────────────────────────────────────
    var rowY = L.TITLE_H + headerH;
    var taskPos = {}; // id → {x,y,w,h,midY}

    rows.forEach(function (row, i) {
      var rh = row.type === 'compact' ? row.h : (row.type === 'group' ? L.GROUP_H : L.ROW_H);
      var isAlt = i % 2 === 1;

      var midY = rowY + rh / 2;

      if (row.type === 'compact') {
        // ── Compact row ─────────────────────────────────────────────────────
        var baseColor = (row.data && row.data.color) || theme.groupBg;

        // Background: white + subtle tint in chart area
        p.push(rect(0, rowY, svgW, rh, { fill: theme.rowBg }));
        p.push(rect(leftTotalW, rowY, chartW, rh, { fill: baseColor, 'fill-opacity': 0.07 }));
        // Left accent stripe
        p.push(rect(0, rowY, 4, rh, { fill: baseColor }));
        // Bottom separator
        p.push(line(0, rowY + rh - 0.5, svgW, rowY + rh - 0.5, { stroke: theme.gridStroke, 'stroke-width': 0.5 }));

        // Left panel: group name
        var labelText = (row.data && (row.data.name || row.data.id)) || '';
        if (labelText) {
          p.push(txt(12, midY, labelText, {
            'font-size': 12, 'font-weight': 'bold', fill: baseColor,
            'dominant-baseline': 'middle', 'clip-path': 'url(#gantt-left)',
          }));
        }
        if (showDates) p.push(line(L.LEFT_W, rowY, L.LEFT_W, rowY + rh, { stroke: theme.leftBorder, 'stroke-width': 1 }));
        p.push(line(leftTotalW, rowY, leftTotalW, rowY + rh, { stroke: theme.leftBorder, 'stroke-width': 1 }));

        // Task bars packed in lanes
        row.assignments.forEach(function (la) {
          var t = la.task;
          if (!t._start || !t._end) return;
          var bx = xDate(t._start);
          var dur = Math.max(daysBetween(t._start, t._end), 1);
          var bw = Math.max(dur * pxPerDay, 3);
          var by = rowY + L.LANE_PAD + la.lane * L.LANE_H + Math.floor((L.LANE_H - L.LANE_BAR_H) / 2);
          var bh = L.LANE_BAR_H;
          var barMidY = by + bh / 2;

          if (bx + bw >= leftTotalW && bx <= leftTotalW + chartW) {
            p.push(rect(bx, by, bw, bh, {
              rx: L.BAR_R, fill: baseColor,
              'clip-path': 'url(#gantt-chart)',
              'data-tip': buildTip(t.name, t.start, t.end, t.note),
            }));
            if (bw > 40) {
              // Label inside bar
              var lx = Math.max(bx + 4, leftTotalW + 2);
              p.push(txt(lx, barMidY, t.name, {
                'font-size': 9, fill: theme.taskFg,
                'dominant-baseline': 'middle',
                'clip-path': 'url(#gantt-chart)',
                'pointer-events': 'none',
              }));
            } else {
              // Label below bar (bar too narrow to fit text inside)
              var cx = bx + bw / 2;
              p.push(txt(cx, by + bh + 2, t.name, {
                'font-size': 8, fill: baseColor,
                'font-weight': '600',
                'text-anchor': 'middle',
                'dominant-baseline': 'hanging',
                'clip-path': 'url(#gantt-chart)',
                'pointer-events': 'none',
              }));
            }
          }
          taskPos[t.id] = { x: bx, y: by, w: bw, h: bh, midY: barMidY };
        });

        // Milestones: group by date to stagger same-day milestones vertically
        var msByDate = {};
        row.milestones.forEach(function (m) {
          if (!m._date) return;
          var key = m.date;
          if (!msByDate[key]) msByDate[key] = [];
          msByDate[key].push(m);
        });
        Object.keys(msByDate).forEach(function (dateKey) {
          var group = msByDate[dateKey];
          var count = group.length;
          var step = L.MS_SIZE * 2.2; // vertical gap between stacked diamonds
          group.forEach(function (m, idx) {
            var msx = xDate(m._date) + pxPerDay / 2;
            if (msx < leftTotalW || msx > leftTotalW + chartW) return;
            var s = L.MS_SIZE;
            // Center the stack around midY
            var my = midY + (idx - (count - 1) / 2) * step;
            p.push(el('polygon', {
              points: msx+','+(my-s)+' '+(msx+s)+','+my+' '+msx+','+(my+s)+' '+(msx-s)+','+my,
              fill: theme.msFill, stroke: theme.msStroke, 'stroke-width': 1.5,
              'clip-path': 'url(#gantt-chart)',
              'data-tip': buildTip(m.name, m.date, null, m.note),
            }));
            // Label rotated -45° from the top tip of the diamond
            var lx = msx + 3;
            var ly = my - s - 3;
            p.push(el('text', {
              x: lx, y: ly,
              'font-size': 9, 'font-weight': '600',
              fill: theme.msFill,
              'dominant-baseline': 'auto',
              transform: 'rotate(-45,' + lx + ',' + ly + ')',
              'clip-path': 'url(#gantt-chart)',
            }, esc(m.name)));
          });
        });

      } else {
        // ── Expanded row (original logic) ────────────────────────────────────
        if (row.type === 'group') {
          var gbg = row.data.color || theme.groupBg;
          p.push(rect(0, rowY, svgW, rh, { fill: gbg }));
        } else {
          p.push(rect(0, rowY, svgW, rh, { fill: isAlt ? theme.rowBgAlt : theme.rowBg }));
        }

        p.push(line(0, rowY + rh - 0.5, svgW, rowY + rh - 0.5, { stroke: theme.gridStroke, 'stroke-width': 0.5 }));

        if (row.type === 'group') {
          var gfg = row.data.color ? '#fff' : theme.groupFg;
          p.push(txt(12, midY, row.data.name || row.data.id, {
            'font-size': 12, 'font-weight': 'bold', fill: gfg,
            'dominant-baseline': 'middle', 'clip-path': 'url(#gantt-left)',
          }));
        } else if (row.type === 'task') {
          p.push(txt(20, midY, row.data.name, {
            'font-size': 11, fill: theme.leftFg,
            'dominant-baseline': 'middle', 'clip-path': 'url(#gantt-left)',
          }));
        } else if (row.type === 'milestone') {
          p.push(txt(20, midY, '◆ ' + row.data.name, {
            'font-size': 11, fill: theme.msFill,
            'dominant-baseline': 'middle', 'clip-path': 'url(#gantt-left)',
          }));
        }

        if (showDates) p.push(line(L.LEFT_W, rowY, L.LEFT_W, rowY + rh, { stroke: theme.leftBorder, 'stroke-width': 1 }));
        p.push(line(leftTotalW, rowY, leftTotalW, rowY + rh, { stroke: theme.leftBorder, 'stroke-width': 1 }));

        if (row.type === 'task') {
          var t = row.data;
          if (showDates && t._start && t._end) {
            var sameDayTask = daysBetween(t._start, t._end) === 0;
            var dateTxtTask = sameDayTask ? shortDate(t._start) : shortDate(t._start) + '〜' + shortDate(t._end);
            p.push(txt(L.LEFT_W + L.DATE_COL_W / 2, midY, dateTxtTask, {
              'font-size': 10, fill: theme.leftFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-date)',
            }));
          }
          if (t._start && t._end) {
            var bx = xDate(t._start);
            var dur = Math.max(daysBetween(t._start, t._end), 1);
            var bw = Math.max(dur * pxPerDay, 3);
            var by = rowY + L.BAR_PAD;
            var bh = rh - 2 * L.BAR_PAD;
            var grp = groupMap[t.group];
            var barColor = (grp && grp.color) || theme.taskBg;

            if (bx + bw >= leftTotalW && bx <= leftTotalW + chartW) {
              p.push(rect(bx, by, bw, bh, {
                rx: L.BAR_R, fill: barColor,
                'clip-path': 'url(#gantt-chart)',
                'data-tip': buildTip(t.name, t.start, t.end, t.note),
              }));
              if (bw > 50) {
                var lx = Math.max(bx + 5, leftTotalW + 3);
                p.push(txt(lx, midY, t.name, {
                  'font-size': 10, fill: theme.taskFg,
                  'dominant-baseline': 'middle',
                  'clip-path': 'url(#gantt-chart)',
                  'pointer-events': 'none',
                }));
              }
            }
            taskPos[t.id] = { x: bx, y: by, w: bw, h: bh, midY: midY };
          }
        } else if (row.type === 'milestone') {
          var m = row.data;
          if (showDates && m._date) {
            p.push(txt(L.LEFT_W + L.DATE_COL_W / 2, midY, shortDate(m._date), {
              'font-size': 10, fill: theme.msFill,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-date)',
            }));
          }
          if (m._date) {
            var msx = xDate(m._date) + pxPerDay / 2;
            if (msx >= leftTotalW && msx <= leftTotalW + chartW) {
              var s = L.MS_SIZE;
              p.push(el('polygon', {
                points: msx+','+(midY-s)+' '+(msx+s)+','+midY+' '+msx+','+(midY+s)+' '+(msx-s)+','+midY,
                fill: theme.msFill, stroke: theme.msStroke, 'stroke-width': 1,
                'clip-path': 'url(#gantt-chart)',
                'data-tip': buildTip(m.name, m.date, null, m.note),
              }));
            }
          }
        }
      } // end expanded

      rowY += rh;
    });

    // ── Today line ────────────────────────────────────────────────────────────
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (today >= dispStart && today <= dispEnd) {
      var tx = xDate(today);
      p.push(line(tx, L.TITLE_H, tx, svgH, {
        stroke: theme.todayStroke, 'stroke-width': 1.5,
        'stroke-dasharray': '4,3', 'clip-path': 'url(#gantt-chart)',
      }));
    }

    // ── Dependency arrows ─────────────────────────────────────────────────────
    if (opts.showArrows) tasks.forEach(function (t) {
      (t.dependencies || []).forEach(function (depId) {
        var src = taskPos[String(depId)];
        var tgt = taskPos[t.id];
        if (!src || !tgt) return;
        var ax1 = src.x + src.w;
        var ay1 = src.midY;
        var ax2 = tgt.x;
        var ay2 = tgt.midY;
        var gap = Math.max((ax2 - ax1) / 2, 6);
        var amx = ax1 + gap;
        p.push('<polyline points="'
          + ax1 + ',' + ay1 + ' '
          + amx + ',' + ay1 + ' '
          + amx + ',' + ay2 + ' '
          + ax2 + ',' + ay2
          + '" fill="none" stroke="' + theme.depStroke
          + '" stroke-width="1.5" marker-end="url(#gantt-arrow)"'
          + ' clip-path="url(#gantt-chart)"/>');
      });
    });

    // ── Left panel header cover ───────────────────────────────────────────────
    p.push(rect(0, L.TITLE_H, leftTotalW, headerH, { fill: theme.headerBg }));
    if (showDates) {
      p.push(line(L.LEFT_W, L.TITLE_H, L.LEFT_W, svgH, { stroke: theme.leftBorder, 'stroke-width': 1 }));
      if (headerH > 4) {
        p.push(txt(L.LEFT_W + L.DATE_COL_W / 2, L.TITLE_H + headerH / 2, '日程', {
          'font-size': 11, 'font-weight': '600', fill: theme.headerFg,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
        }));
      }
    }
    p.push(line(leftTotalW, L.TITLE_H, leftTotalW, svgH, { stroke: theme.leftBorder, 'stroke-width': 1 }));
    p.push(line(0, L.TITLE_H + headerH - 0.5, leftTotalW, L.TITLE_H + headerH - 0.5, { stroke: theme.headerBorder, 'stroke-width': 1 }));

    p.push('</svg>');
    return p.join('\n');
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.GanttChart = {
    render: render,
    themes: Object.keys(THEMES),
  };
})();

/* Gantt chart SVG renderer — vanilla JS, no dependencies */
(function () {
  'use strict';

  // ── Layout constants ───────────────────────────────────────────────────────
  const L = {
    LEFT_W: 230,
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

  // ── Main render function ───────────────────────────────────────────────────
  function render(spec, opts) {
    opts = opts || {};
    const theme = THEMES[opts.theme] || THEMES.blue;
    const unit = (spec.display && spec.display.unit) || opts.unit || 'week';
    const pxPerDay = opts.pxPerDay || PX_PER_DAY[unit] || PX_PER_DAY.week;

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
      dispStart = addDays(dispStart, -3);
    }
    if (spec.display && spec.display.end) {
      dispEnd = parseDate(spec.display.end);
    } else {
      var ends = tasks.map(function (t) { return t._end; }).concat(milestones.map(function (m) { return m._date; })).filter(Boolean);
      dispEnd = ends.length ? new Date(Math.max.apply(null, ends)) : addDays(dispStart, 30);
      dispEnd = addDays(dispEnd, 3);
    }

    // Snap start
    if (unit === 'week') dispStart = startOfWeek(dispStart);
    else if (unit === 'month') dispStart = startOfMonth(dispStart);

    var totalDays = daysBetween(dispStart, dispEnd);
    var chartW = Math.ceil(totalDays * pxPerDay);
    var svgW = L.LEFT_W + chartW;

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
    var svgH = L.TITLE_H + L.HEADER_H + rowsH;

    function xDate(d) {
      return L.LEFT_W + daysBetween(dispStart, d) * pxPerDay;
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
      + rect(L.LEFT_W, 0, chartW, svgH, {})
      + '</clipPath>');
    p.push('<clipPath id="gantt-left">'
      + rect(0, 0, L.LEFT_W - 1, svgH, {})
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

    // ── Timeline header ───────────────────────────────────────────────────────
    var hY = L.TITLE_H;
    var topH = Math.round(L.HEADER_H * 0.44);
    var botH = L.HEADER_H - topH;

    p.push(rect(0, hY, svgW, L.HEADER_H, { fill: theme.headerBg }));

    if (unit === 'day' || unit === 'week') {
      // Top row: months
      var cur = startOfMonth(dispStart);
      while (cur <= dispEnd) {
        var nm = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        var x1 = Math.max(xDate(cur), L.LEFT_W);
        var x2 = Math.min(xDate(nm), L.LEFT_W + chartW);
        var w = x2 - x1;
        if (w > 4) {
          p.push(rect(x1, hY, w, topH, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (w > 28) {
            p.push(txt(x1 + w / 2, hY + topH / 2, formatDate(cur, 'MMM YY'), {
              'font-size': 11, 'font-weight': '600', fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
        cur = nm;
      }
      // Bottom row: weeks or days
      if (unit === 'week') {
        var ws = startOfWeek(dispStart);
        while (ws <= dispEnd) {
          var wx = xDate(ws);
          var ww = 7 * pxPerDay;
          var cx1 = Math.max(wx, L.LEFT_W);
          var cx2 = Math.min(wx + ww, L.LEFT_W + chartW);
          var cw = cx2 - cx1;
          if (cw > 2) {
            p.push(rect(cx1, hY + topH, cw, botH, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
            if (cw > 22) {
              p.push(txt(cx1 + cw / 2, hY + topH + botH / 2, formatDate(ws, 'M/D'), {
                'font-size': 10, fill: theme.headerFg,
                'text-anchor': 'middle', 'dominant-baseline': 'middle',
                'clip-path': 'url(#gantt-chart)',
              }));
            }
          }
          ws = addDays(ws, 7);
        }
      } else {
        var day = new Date(dispStart.getTime());
        while (day <= dispEnd) {
          var dx = xDate(day);
          if (dx >= L.LEFT_W && dx < L.LEFT_W + chartW) {
            p.push(rect(dx, hY + topH, pxPerDay, botH, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
            if (pxPerDay > 15) {
              p.push(txt(dx + pxPerDay / 2, hY + topH + botH / 2, String(day.getDate()), {
                'font-size': 9, fill: theme.headerFg,
                'text-anchor': 'middle', 'dominant-baseline': 'middle',
              }));
            }
          }
          day = addDays(day, 1);
        }
      }
    } else {
      // month unit: top = year, bottom = months
      for (var y = dispStart.getFullYear(); y <= dispEnd.getFullYear(); y++) {
        var ys = new Date(y, 0, 1);
        var ye = new Date(y + 1, 0, 1);
        var yx1 = Math.max(xDate(ys), L.LEFT_W);
        var yx2 = Math.min(xDate(ye), L.LEFT_W + chartW);
        var yw = yx2 - yx1;
        if (yw > 4) {
          p.push(rect(yx1, hY, yw, topH, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (yw > 20) {
            p.push(txt(yx1 + yw / 2, hY + topH / 2, String(y), {
              'font-size': 11, 'font-weight': '600', fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
      }
      var mc = startOfMonth(dispStart);
      while (mc <= dispEnd) {
        var mnext = new Date(mc.getFullYear(), mc.getMonth() + 1, 1);
        var mx1 = Math.max(xDate(mc), L.LEFT_W);
        var mx2 = Math.min(xDate(mnext), L.LEFT_W + chartW);
        var mw = mx2 - mx1;
        if (mw > 4) {
          p.push(rect(mx1, hY + topH, mw, botH, { fill: theme.headerBg, stroke: theme.headerBorder, 'stroke-width': 0.5 }));
          if (mw > 16) {
            p.push(txt(mx1 + mw / 2, hY + topH + botH / 2, formatDate(mc, 'M月'), {
              'font-size': 10, fill: theme.headerFg,
              'text-anchor': 'middle', 'dominant-baseline': 'middle',
              'clip-path': 'url(#gantt-chart)',
            }));
          }
        }
        mc = mnext;
      }
    }

    // ── Grid lines ────────────────────────────────────────────────────────────
    var gridTop = L.TITLE_H + L.HEADER_H;
    var gridBot = svgH;

    if (unit === 'week') {
      var gw = startOfWeek(dispStart);
      while (gw <= dispEnd) {
        var gx = xDate(gw);
        if (gx >= L.LEFT_W) {
          p.push(line(gx, gridTop, gx, gridBot, { stroke: theme.gridStroke, 'stroke-width': 1 }));
        }
        gw = addDays(gw, 7);
      }
    } else if (unit === 'month') {
      var gmc = startOfMonth(dispStart);
      while (gmc <= dispEnd) {
        var gmx = xDate(gmc);
        if (gmx >= L.LEFT_W) {
          p.push(line(gmx, gridTop, gmx, gridBot, { stroke: theme.gridStroke, 'stroke-width': 1 }));
        }
        gmc = new Date(gmc.getFullYear(), gmc.getMonth() + 1, 1);
      }
    } else {
      var gday = new Date(dispStart.getTime());
      while (gday <= dispEnd) {
        if (gday.getDay() === 1) {
          var gdx = xDate(gday);
          if (gdx >= L.LEFT_W) {
            p.push(line(gdx, gridTop, gdx, gridBot, { stroke: theme.gridStroke, 'stroke-width': 1 }));
          }
        }
        gday = addDays(gday, 1);
      }
    }

    // ── Rows ──────────────────────────────────────────────────────────────────
    var rowY = L.TITLE_H + L.HEADER_H;
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
        p.push(rect(L.LEFT_W, rowY, chartW, rh, { fill: baseColor, 'fill-opacity': 0.07 }));
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
        p.push(line(L.LEFT_W, rowY, L.LEFT_W, rowY + rh, { stroke: theme.leftBorder, 'stroke-width': 1 }));

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

          if (bx + bw >= L.LEFT_W && bx <= L.LEFT_W + chartW) {
            p.push(rect(bx, by, bw, bh, {
              rx: L.BAR_R, fill: baseColor,
              'clip-path': 'url(#gantt-chart)',
            }));
            if (bw > 40) {
              var lx = Math.max(bx + 4, L.LEFT_W + 2);
              p.push(txt(lx, barMidY, t.name, {
                'font-size': 9, fill: theme.taskFg,
                'dominant-baseline': 'middle',
                'clip-path': 'url(#gantt-chart)',
              }));
            }
          }
          taskPos[t.id] = { x: bx, y: by, w: bw, h: bh, midY: barMidY };
        });

        // Milestones: centered in row
        row.milestones.forEach(function (m) {
          if (!m._date) return;
          var msx = xDate(m._date);
          if (msx >= L.LEFT_W && msx <= L.LEFT_W + chartW) {
            var s = L.MS_SIZE;
            p.push('<polygon points="'
              + msx + ',' + (midY - s) + ' '
              + (msx + s) + ',' + midY + ' '
              + msx + ',' + (midY + s) + ' '
              + (msx - s) + ',' + midY
              + '" fill="' + theme.msFill + '" stroke="' + theme.msStroke
              + '" stroke-width="1.5" clip-path="url(#gantt-chart)"/>');
          }
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

        p.push(line(L.LEFT_W, rowY, L.LEFT_W, rowY + rh, { stroke: theme.leftBorder, 'stroke-width': 1 }));

        if (row.type === 'task') {
          var t = row.data;
          if (t._start && t._end) {
            var bx = xDate(t._start);
            var dur = Math.max(daysBetween(t._start, t._end), 1);
            var bw = Math.max(dur * pxPerDay, 3);
            var by = rowY + L.BAR_PAD;
            var bh = rh - 2 * L.BAR_PAD;
            var grp = groupMap[t.group];
            var barColor = (grp && grp.color) || theme.taskBg;

            if (bx + bw >= L.LEFT_W && bx <= L.LEFT_W + chartW) {
              p.push(rect(bx, by, bw, bh, {
                rx: L.BAR_R, fill: barColor,
                'clip-path': 'url(#gantt-chart)',
              }));
              if (bw > 50) {
                var lx = Math.max(bx + 5, L.LEFT_W + 3);
                p.push(txt(lx, midY, t.name, {
                  'font-size': 10, fill: theme.taskFg,
                  'dominant-baseline': 'middle',
                  'clip-path': 'url(#gantt-chart)',
                }));
              }
              if (t.note) {
                p.push('<title>' + esc(t.name + ': ' + t.note) + '</title>');
              }
            }
            taskPos[t.id] = { x: bx, y: by, w: bw, h: bh, midY: midY };
          }
        } else if (row.type === 'milestone') {
          var m = row.data;
          if (m._date) {
            var msx = xDate(m._date);
            if (msx >= L.LEFT_W && msx <= L.LEFT_W + chartW) {
              var s = L.MS_SIZE;
              p.push('<polygon points="'
                + msx + ',' + (midY - s) + ' '
                + (msx + s) + ',' + midY + ' '
                + msx + ',' + (midY + s) + ' '
                + (msx - s) + ',' + midY
                + '" fill="' + theme.msFill + '" stroke="' + theme.msStroke
                + '" stroke-width="1" clip-path="url(#gantt-chart)"/>');
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
    tasks.forEach(function (t) {
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
    p.push(rect(0, L.TITLE_H, L.LEFT_W, L.HEADER_H, { fill: theme.headerBg }));
    p.push(line(L.LEFT_W, L.TITLE_H, L.LEFT_W, svgH, { stroke: theme.leftBorder, 'stroke-width': 1 }));
    p.push(line(0, L.TITLE_H + L.HEADER_H - 0.5, L.LEFT_W, L.TITLE_H + L.HEADER_H - 0.5, { stroke: theme.headerBorder, 'stroke-width': 1 }));

    p.push('</svg>');
    return p.join('\n');
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.GanttChart = {
    render: render,
    themes: Object.keys(THEMES),
  };
})();

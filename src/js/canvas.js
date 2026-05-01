// ─── canvas.js ───────────────────────────────────────────────────────────────

const Canvas = (() => {

  // ── Stan ────────────────────────────────────────────────────────────────────
  let _canvas = null, _ctx = null;
  let _mode = 'select';
  let _shapes = [];
  let _selId = null;
  let _isDrawing = false, _drawStart = null, _drawCurrent = null;
  let _dragOff = null, _resizeHandle = null;
  let _onSelectionChange = null; // callback(shape | null)

  const AC      = '#2563EB';
  const INK     = '#1A1A18';
  const GRID    = '#EBEBEA';
  const DIM_COL = '#94A3B8';
  const SNAP    = 20;
  const HIT     = 12;

  // ── Init ────────────────────────────────────────────────────────────────────
  function init(canvasEl, onSelectionChange) {
    _canvas = canvasEl;
    _ctx = canvasEl.getContext('2d');
    _onSelectionChange = onSelectionChange || null;

    _canvas.addEventListener('mousedown',  _onDown);
    _canvas.addEventListener('mousemove',  _onMove);
    _canvas.addEventListener('mouseup',    _onUp);
    _canvas.addEventListener('touchstart', _onDown, { passive: false });
    _canvas.addEventListener('touchmove',  _onMove, { passive: false });
    _canvas.addEventListener('touchend',   _onUp,   { passive: false });

    _resize();
    window.addEventListener('resize', _resize);
  }

  function _resize() {
    if (!_canvas) return;
    const wrap = _canvas.parentElement;
    _canvas.width  = wrap.clientWidth;
    _canvas.height = wrap.clientHeight;
    _redraw();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function _getPos(e) {
    const r   = _canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function _snapPt(x, y) {
    let sx = x, sy = y, best = SNAP * SNAP, snapped = false;
    _shapes.forEach(s => _getSnapPoints(s).forEach(p => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < best) { best = d; sx = p.x; sy = p.y; snapped = true; }
    }));
    return { x: sx, y: sy, snapped };
  }

  function _getSnapPoints(s) {
    if (s.type === 'rect') return [
      { x: s.x,       y: s.y },       { x: s.x + s.w, y: s.y },
      { x: s.x,       y: s.y + s.h }, { x: s.x + s.w, y: s.y + s.h },
      { x: s.x + s.w / 2, y: s.y },   { x: s.x + s.w / 2, y: s.y + s.h },
      { x: s.x,       y: s.y + s.h / 2 }, { x: s.x + s.w, y: s.y + s.h / 2 },
    ];
    if (s.type === 'circle') return [
      { x: s.cx,       y: s.cy - s.r }, { x: s.cx,       y: s.cy + s.r },
      { x: s.cx - s.r, y: s.cy },       { x: s.cx + s.r, y: s.cy },
    ];
    if (s.type === 'line') return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
    return [];
  }

  function _ptToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    if (!l2) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // ── Handles ─────────────────────────────────────────────────────────────────
  function _getHandles(s) {
    if (!s) return [];
    if (s.type === 'rect') return [
      { id: 'tl', x: s.x,           y: s.y           },
      { id: 'tr', x: s.x + s.w,     y: s.y           },
      { id: 'bl', x: s.x,           y: s.y + s.h     },
      { id: 'br', x: s.x + s.w,     y: s.y + s.h     },
      { id: 'tm', x: s.x + s.w / 2, y: s.y           },
      { id: 'bm', x: s.x + s.w / 2, y: s.y + s.h     },
      { id: 'ml', x: s.x,           y: s.y + s.h / 2 },
      { id: 'mr', x: s.x + s.w,     y: s.y + s.h / 2 },
    ];
    if (s.type === 'circle') return [
      { id: 'top', x: s.cx,       y: s.cy - s.r },
      { id: 'bot', x: s.cx,       y: s.cy + s.r },
      { id: 'lft', x: s.cx - s.r, y: s.cy       },
      { id: 'rgt', x: s.cx + s.r, y: s.cy       },
    ];
    if (s.type === 'line') return [
      { id: 'p1', x: s.x1, y: s.y1 },
      { id: 'p2', x: s.x2, y: s.y2 },
    ];
    return [];
  }

  function _hitHandle(x, y, s) {
    for (const h of _getHandles(s))
      if (Math.hypot(x - h.x, y - h.y) < HIT) return h.id;
    return null;
  }

  function _applyResize(s, hid, nx, ny) {
    if (s.type === 'rect') {
      const bx = s.x + s.w, by = s.y + s.h;
      if (hid === 'tl') { s.x = Math.min(nx, bx - 10); s.y = Math.min(ny, by - 10); s.w = bx - s.x; s.h = by - s.y; }
      else if (hid === 'tr') { s.w = Math.max(10, nx - s.x); s.y = Math.min(ny, by - 10); s.h = by - s.y; }
      else if (hid === 'bl') { s.x = Math.min(nx, bx - 10); s.w = bx - s.x; s.h = Math.max(10, ny - s.y); }
      else if (hid === 'br') { s.w = Math.max(10, nx - s.x); s.h = Math.max(10, ny - s.y); }
      else if (hid === 'tm') { s.y = Math.min(ny, by - 10); s.h = by - s.y; }
      else if (hid === 'bm') { s.h = Math.max(10, ny - s.y); }
      else if (hid === 'ml') { s.x = Math.min(nx, bx - 10); s.w = bx - s.x; }
      else if (hid === 'mr') { s.w = Math.max(10, nx - s.x); }
    } else if (s.type === 'circle') {
      s.r = Math.max(10, Math.hypot(nx - s.cx, ny - s.cy));
    } else if (s.type === 'line') {
      if (hid === 'p1') { s.x1 = nx; s.y1 = ny; }
      else              { s.x2 = nx; s.y2 = ny; }
    }
  }

  // ── Hit test ────────────────────────────────────────────────────────────────
  function _hitTest(x, y) {
    const sel = _shapes.find(s => s.id === _selId);
    if (sel) { const hh = _hitHandle(x, y, sel); if (hh) return { id: sel.id, handle: hh }; }

    for (let i = _shapes.length - 1; i >= 0; i--) {
      const s = _shapes[i];
      if (s.type === 'rect'   && x >= s.x - 5 && x <= s.x + s.w + 5 && y >= s.y - 5 && y <= s.y + s.h + 5) return { id: s.id };
      if (s.type === 'circle' && Math.hypot(x - s.cx, y - s.cy) <= s.r + 6)                                   return { id: s.id };
      if (s.type === 'line'   && _ptToSeg(x, y, s.x1, s.y1, s.x2, s.y2) < HIT)                               return { id: s.id };
    }
    return null;
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  let _lastTap = 0;

  function _onDown(e) {
    e.preventDefault();
    const p = _getPos(e);

    // Dwuklik / double-tap — zaznacz element
    const now = Date.now();
    if (e.type === 'touchstart' && now - _lastTap < 300) {
      const hit = _hitTest(p.x, p.y);
      if (hit && !hit.handle) { _select(hit.id); }
    }
    _lastTap = now;

    if (_mode === 'select') {
      const hit = _hitTest(p.x, p.y);
      if (hit && hit.handle) {
        _resizeHandle = hit.handle; _selId = hit.id;
      } else if (hit) {
        _selId = hit.id; _resizeHandle = null;
        const s = _shapes.find(s => s.id === hit.id);
        if (s) {
          const ox = s.type === 'circle' ? s.cx : s.type === 'line' ? s.x1 : s.x;
          const oy = s.type === 'circle' ? s.cy : s.type === 'line' ? s.y1 : s.y;
          _dragOff = { dx: p.x - ox, dy: p.y - oy };
        }
        _notifySelection();
      } else {
        _selId = null; _dragOff = null; _resizeHandle = null;
        _notifySelection();
      }
      _redraw(); return;
    }

    // Tryby rysowania
    _isDrawing = true;
    if (_mode === 'line') {
      const sp = _snapPt(p.x, p.y);
      _drawStart = { x: sp.x, y: sp.y };
    } else {
      _drawStart = { x: p.x, y: p.y };
    }
    _drawCurrent = { ..._drawStart };
  }

  function _onMove(e) {
    e.preventDefault();
    const p = _getPos(e);

    if (_mode === 'select') {
      if (_resizeHandle && _selId) {
        const s = _shapes.find(s => s.id === _selId);
        if (s) { _applyResize(s, _resizeHandle, p.x, p.y); _redraw(); }
        return;
      }
      if (_dragOff && _selId) {
        const s = _shapes.find(s => s.id === _selId);
        if (!s) return;
        const nx = p.x - _dragOff.dx, ny = p.y - _dragOff.dy;
        if (s.type === 'rect')   { s.x = nx; s.y = ny; }
        else if (s.type === 'circle') { s.cx = nx; s.cy = ny; }
        else if (s.type === 'line')   { const ox = s.x1, oy = s.y1; s.x1 = nx; s.y1 = ny; s.x2 += nx - ox; s.y2 += ny - oy; }
        _redraw(); return;
      }
      const sel = _shapes.find(s => s.id === _selId);
      _canvas.style.cursor = (sel && _hitHandle(p.x, p.y, sel)) ? 'nwse-resize' : 'default';
      return;
    }

    if (!_isDrawing || !_drawStart) return;
    if (_mode === 'line') { const sp = _snapPt(p.x, p.y); _drawCurrent = { x: sp.x, y: sp.y }; }
    else                  { _drawCurrent = { x: p.x, y: p.y }; }
    _redraw();
    _drawPreview();
  }

  function _onUp(e) {
    e.preventDefault();
    if (_mode === 'select') { _resizeHandle = null; _dragOff = null; _canvas.style.cursor = 'default'; return; }
    if (!_isDrawing || !_drawStart || !_drawCurrent) { _isDrawing = false; return; }
    _isDrawing = false;

    const dx = _drawCurrent.x - _drawStart.x, dy = _drawCurrent.y - _drawStart.y;
    if (Math.hypot(dx, dy) < 8) { _drawStart = null; _drawCurrent = null; _redraw(); return; }

    let s = { id: _uid(), label: '', dimW: 0, dimH: 0 };

    if (_mode === 'rect') {
      const rw = Math.abs(dx), rh = Math.abs(dy);
      s = { ...s, type: 'rect',
        x: Math.min(_drawStart.x, _drawCurrent.x),
        y: Math.min(_drawStart.y, _drawCurrent.y),
        w: rw, h: rh,
        dimW: Math.round(rw), dimH: Math.round(rh) };
    } else if (_mode === 'circle') {
      const r = Math.hypot(dx, dy) / 2;
      s = { ...s, type: 'circle', cx: _drawStart.x, cy: _drawStart.y, r,
        dimW: Math.round(r * 2) };
    } else if (_mode === 'line') {
      let x2 = _drawCurrent.x, y2 = _drawCurrent.y;
      const ang = Math.abs(Math.atan2(dy, dx));
      if (ang < 0.18)              y2 = _drawStart.y;
      else if (ang > Math.PI-0.18) y2 = _drawStart.y;
      else if (Math.abs(ang - Math.PI / 2) < 0.18) x2 = _drawStart.x;
      s = { ...s, type: 'line', x1: _drawStart.x, y1: _drawStart.y, x2, y2,
        dimW: Math.round(Math.hypot(x2 - _drawStart.x, y2 - _drawStart.y)) };
    }

    _shapes.push(s);
    _drawStart = null; _drawCurrent = null;
    _select(s.id);
    setMode('select');
    _redraw();
  }

  function _select(id) {
    _selId = id;
    _notifySelection();
    _redraw();
  }

  function _notifySelection() {
    if (typeof _onSelectionChange === 'function') {
      _onSelectionChange(_shapes.find(s => s.id === _selId) || null);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  function setMode(m) {
    _mode = m;
    if (m !== 'select') { _selId = null; _notifySelection(); }
    _canvas.style.cursor = m === 'select' ? 'default' : 'crosshair';
    _redraw();
  }

  function updateShape(id, changes) {
    const s = _shapes.find(s => s.id === id);
    if (!s) return;
    Object.assign(s, changes);
    // Przelicz rozmiar px na podstawie mm jeśli podano
    if (changes.dimW && (s.type === 'rect' || s.type === 'circle')) {
      const px = Math.min(Math.max(changes.dimW / 3, 30), 400);
      if (s.type === 'rect')   { const cx = s.x + s.w / 2; s.w = px; s.x = cx - s.w / 2; }
      if (s.type === 'circle') { s.r = px / 2; }
    }
    if (changes.dimH && s.type === 'rect') {
      const px = Math.min(Math.max(changes.dimH / 3, 20), 350);
      const cy = s.y + s.h / 2; s.h = px; s.y = cy - s.h / 2;
    }
    _redraw();
  }

  function deleteSelected() {
    _shapes = _shapes.filter(s => s.id !== _selId);
    _selId = null; _notifySelection(); _redraw();
  }

  function undo() {
    if (_shapes.length === 0) return;
    _shapes.pop(); _selId = null; _notifySelection(); _redraw();
  }

  function clearAll() {
    _shapes = []; _selId = null; _notifySelection(); _redraw();
  }

  function getSelected() { return _shapes.find(s => s.id === _selId) || null; }
  function getShapes()   { return _shapes; }
  function getCanvas()   { return _canvas; }

  // ── Rysowanie ────────────────────────────────────────────────────────────────
  function _rr(x, y, w, h, r) {
    if (_ctx.roundRect) { _ctx.roundRect(x, y, w, h, r); return; }
    _ctx.beginPath();
    _ctx.moveTo(x + r, y); _ctx.lineTo(x + w - r, y);
    _ctx.arcTo(x + w, y, x + w, y + r, r); _ctx.lineTo(x + w, y + h - r);
    _ctx.arcTo(x + w, y + h, x + w - r, y + h, r); _ctx.lineTo(x + r, y + h);
    _ctx.arcTo(x, y + h, x, y + h - r, r); _ctx.lineTo(x, y + r);
    _ctx.arcTo(x, y, x + r, y, r);
  }

  function _tag(text, x, y, col) {
    _ctx.save();
    _ctx.font = '500 11px DM Mono, monospace';
    _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
    const tw = _ctx.measureText(text).width, pw = tw + 10, ph = 18;
    _ctx.fillStyle = 'rgba(255,255,255,0.96)';
    _ctx.strokeStyle = col || DIM_COL; _ctx.lineWidth = 1;
    _rr(x - pw / 2, y - ph / 2, pw, ph, 4);
    _ctx.fill(); _ctx.stroke();
    _ctx.fillStyle = col || DIM_COL; _ctx.fillText(text, x, y);
    _ctx.restore();
  }

  function _dimLine(x1, y1, x2, y2, label) {
    _ctx.save();
    _ctx.strokeStyle = DIM_COL; _ctx.lineWidth = 1; _ctx.setLineDash([3, 3]);
    _ctx.beginPath(); _ctx.moveTo(x1, y1); _ctx.lineTo(x2, y2); _ctx.stroke();
    _ctx.setLineDash([]);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    [[x1, y1, -1], [x2, y2, 1]].forEach(([px, py, dir]) => {
      _ctx.beginPath(); _ctx.moveTo(px, py);
      _ctx.lineTo(px + dir * 6 * Math.cos(ang) - 3 * Math.sin(ang), py + dir * 6 * Math.sin(ang) + 3 * Math.cos(ang));
      _ctx.lineTo(px + dir * 6 * Math.cos(ang) + 3 * Math.sin(ang), py + dir * 6 * Math.sin(ang) - 3 * Math.cos(ang));
      _ctx.closePath(); _ctx.fillStyle = DIM_COL; _ctx.fill();
    });
    if (label) _tag(label, (x1 + x2) / 2, (y1 + y2) / 2, DIM_COL);
    _ctx.restore();
  }

  function _handle(x, y) {
    _ctx.save();
    _ctx.fillStyle = '#fff'; _ctx.strokeStyle = AC; _ctx.lineWidth = 2;
    _ctx.beginPath(); _ctx.arc(x, y, 5, 0, Math.PI * 2); _ctx.fill(); _ctx.stroke();
    _ctx.restore();
  }

  function _drawShape(s, sel) {
    _ctx.save();
    const OFF = 24;
    _ctx.strokeStyle = sel ? AC : INK;
    _ctx.lineWidth   = sel ? 2.5 : 1.8;
    _ctx.fillStyle   = sel ? 'rgba(37,99,235,0.04)' : 'rgba(0,0,0,0.01)';
    _ctx.lineCap = 'round'; _ctx.lineJoin = 'round';

    if (s.type === 'rect') {
      _ctx.beginPath(); _rr(s.x, s.y, s.w, s.h, 3); _ctx.fill(); _ctx.stroke();
      if (s.label) _tag(s.label, s.x + s.w / 2, s.y + s.h / 2, AC);
      if (s.dimW)  _dimLine(s.x, s.y - OFF, s.x + s.w, s.y - OFF, s.dimW + ' mm');
      if (s.dimH)  _dimLine(s.x + s.w + OFF, s.y, s.x + s.w + OFF, s.y + s.h, s.dimH + ' mm');
      if (sel) _getHandles(s).forEach(h => _handle(h.x, h.y));

    } else if (s.type === 'circle') {
      _ctx.beginPath(); _ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2); _ctx.fill(); _ctx.stroke();
      if (s.label) _tag(s.label, s.cx, s.cy, AC);
      if (s.dimW)  _dimLine(s.cx - s.r, s.cy - s.r - OFF, s.cx + s.r, s.cy - s.r - OFF, '⌀' + s.dimW + ' mm');
      if (sel) _getHandles(s).forEach(h => _handle(h.x, h.y));

    } else if (s.type === 'line') {
      _ctx.beginPath(); _ctx.moveTo(s.x1, s.y1); _ctx.lineTo(s.x2, s.y2); _ctx.stroke();
      const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), hs = 9;
      _ctx.beginPath();
      _ctx.moveTo(s.x2, s.y2);
      _ctx.lineTo(s.x2 - hs * Math.cos(ang - 0.4), s.y2 - hs * Math.sin(ang - 0.4));
      _ctx.lineTo(s.x2 - hs * Math.cos(ang + 0.4), s.y2 - hs * Math.sin(ang + 0.4));
      _ctx.closePath(); _ctx.fillStyle = sel ? AC : INK; _ctx.fill();
      if (s.label) _tag(s.label, (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2 - 16, AC);
      if (s.dimW)  _tag(s.dimW + ' mm', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2 + 16, DIM_COL);
      if (sel) { _handle(s.x1, s.y1); _handle(s.x2, s.y2); }
    }
    _ctx.restore();
  }

  function _drawPreview() {
    if (!_drawStart || !_drawCurrent) return;
    const dx = _drawCurrent.x - _drawStart.x, dy = _drawCurrent.y - _drawStart.y;
    _ctx.save();
    _ctx.strokeStyle = AC; _ctx.lineWidth = 1.5; _ctx.setLineDash([5, 4]);
    _ctx.fillStyle = 'rgba(37,99,235,0.03)'; _ctx.lineCap = 'round';
    if (_mode === 'rect') {
      const x = Math.min(_drawStart.x, _drawCurrent.x), y = Math.min(_drawStart.y, _drawCurrent.y);
      _ctx.beginPath(); _rr(x, y, Math.abs(dx), Math.abs(dy), 3); _ctx.fill(); _ctx.stroke();
      _tag(`${Math.round(Math.abs(dx))} × ${Math.round(Math.abs(dy))}`, x + Math.abs(dx)/2, y + Math.abs(dy)/2, '#94A3B8');
    } else if (_mode === 'circle') {
      const r = Math.hypot(dx, dy) / 2;
      _ctx.beginPath(); _ctx.arc(_drawStart.x, _drawStart.y, r, 0, Math.PI * 2); _ctx.fill(); _ctx.stroke();
      _tag('⌀ ' + Math.round(r * 2), _drawStart.x, _drawStart.y, '#94A3B8');
    } else if (_mode === 'line') {
      _ctx.beginPath(); _ctx.moveTo(_drawStart.x, _drawStart.y); _ctx.lineTo(_drawCurrent.x, _drawCurrent.y); _ctx.stroke();
      const sp = _snapPt(_drawCurrent.x, _drawCurrent.y);
      if (sp.snapped) { _ctx.setLineDash([]); _ctx.fillStyle = AC; _ctx.beginPath(); _ctx.arc(sp.x, sp.y, 5, 0, Math.PI*2); _ctx.fill(); }
      _tag(Math.round(Math.hypot(dx,dy)) + ' px', (_drawStart.x+_drawCurrent.x)/2, (_drawStart.y+_drawCurrent.y)/2 - 14, '#94A3B8');
    }
    _ctx.setLineDash([]); _ctx.restore();
  }

  function _redraw() {
    if (!_ctx) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _ctx.fillStyle = '#FAFAF7'; _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    // Siatka
    _ctx.save(); _ctx.strokeStyle = GRID; _ctx.lineWidth = 1;
    for (let x = 0; x < _canvas.width;  x += 32) { _ctx.beginPath(); _ctx.moveTo(x, 0); _ctx.lineTo(x, _canvas.height); _ctx.stroke(); }
    for (let y = 0; y < _canvas.height; y += 32) { _ctx.beginPath(); _ctx.moveTo(0, y); _ctx.lineTo(_canvas.width, y); _ctx.stroke(); }
    _ctx.restore();
    _shapes.forEach(s => _drawShape(s, s.id === _selId));
    if (_isDrawing) _drawPreview();
  }

  return {
    init, setMode,
    updateShape, deleteSelected, undo, clearAll,
    getSelected, getShapes, getCanvas,
  };
})();

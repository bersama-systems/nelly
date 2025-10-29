import React, { useState, useEffect, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, Background, Controls, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';

// LimitsEditor: edits array of root limit objects stored in Redis key nelly_limits via /api/v1/limits
// Root object shape (flexible based on examples in limits.json):
// {
//   limit_class: 'plan' | 'product',
//   name: string,
//   uri?: string, verb?: string, short_name?: string,
//   limit_key: string | string[],
//   limits: [ { condition: Condition, threshold: number, interval_seconds: number } ]
// }
// Condition shape: { name: string, lhs: string|Condition, operator: string, rhs: string|Condition }
// Operators logic: and | or | eq | neq | lte | gte

const NODE_X_START = 40;
const NODE_Y_START = 40;
const NODE_X_GAP = 280;
const NODE_Y_GAP = 170;

const VALID_OPERATORS = ['and','or','eq','neq','lte','gte'];
const LIMIT_CLASSES = ['plan','product'];

function normalizeLimitKey(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function defaultCondition() {
  return { name: 'Condition', lhs: 'lhs', operator: 'eq', rhs: 'rhs' };
}

function defaultRoot(existingCount) {
  return {
    limit_class: 'plan',
    name: `new_root_${existingCount + 1}`,
    uri: '/api/example',
    limit_key: ['ngx.var.http_x_account_plan','ngx.var.http_x_account_id'],
    limits: [ { condition: defaultCondition(), threshold: 1, interval_seconds: 60 } ]
  };
}

function buildNode(root, index, editingId, handlers, pos) {
  const isEditing = editingId === String(index);
  return {
    id: String(index),
    type: 'plain',
    position: pos || { x: NODE_X_START + (index % 4) * NODE_X_GAP, y: NODE_Y_START + Math.floor(index / 4) * NODE_Y_GAP },
    data: { root, index, isEditing, ...handlers },
    draggable: true,
    style: { background: 'transparent', border: 'none', cursor: 'pointer', zIndex: isEditing ? 1000 : 0 }
  };
}

const PlainNode = ({ data }) => {
  const { root, index, isEditing, onEdit, onDelete } = data;
  return (
    <div style={{ background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 8, padding: 10, minWidth: 260, fontSize: 12, position: 'relative' }}>
      {!isEditing && (
        <button onClick={() => { if (window.confirm(`Delete root '${root.name}'?`)) onDelete(index); }} style={{ position: 'absolute', top: 4, right: 4, background: '#441111', color: '#fff', border: '1px solid #662222', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', lineHeight: '18px', fontSize: 12, padding: 0 }}>×</button>
      )}
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{root.name}</div>
      <div style={{ fontSize: 11 }}>class: {root.limit_class}</div>
      {root.verb && <div style={{ fontSize: 11 }}>verb: {root.verb}</div>}
      {root.uri && <div style={{ fontSize: 11, overflowWrap: 'anywhere' }}>uri: {root.uri}</div>}
      <div style={{ fontSize: 11 }}>limits: {root.limits.length}</div>
      <button onClick={() => onEdit(index)} style={{ marginTop: 8, background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Edit</button>
    </div>
  );
};

const nodeTypes = { plain: PlainNode };

function ConditionEditor({ value, onChange }) {
  const isLogic = value.operator === 'and' || value.operator === 'or';
  const updateField = (field, newVal) => {
    onChange({ ...value, [field]: newVal });
  };
  const toggleNested = (side) => {
    const cur = value[side];
    if (typeof cur === 'string') updateField(side, defaultCondition()); else updateField(side, 'operand');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#1c1c1c', border: '1px solid #333', padding: 8, borderRadius: 6 }}>
      <input value={value.name || ''} onChange={e => updateField('name', e.target.value)} placeholder="Condition name" style={{ background: '#181818', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '4px 6px', fontSize: 11 }} />
      <label style={{ fontSize: 11 }}>Operator:
        <select value={value.operator} onChange={e => updateField('operator', e.target.value)} style={{ marginLeft: 6, background: '#181818', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}>
          {VALID_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11 }}>LHS</span>
            {(value.operator === 'and' || value.operator === 'or') && <button onClick={() => toggleNested('lhs')} style={{ background: '#333', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>{typeof value.lhs === 'string' ? 'Nest' : 'Plain'}</button>}
          </div>
          {typeof value.lhs === 'string' ? (
            <input value={value.lhs} onChange={e => updateField('lhs', e.target.value)} placeholder="lhs" style={{ width: '100%', background: '#181818', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '4px 6px', fontSize: 11 }} />
          ) : (
            <ConditionEditor value={value.lhs} onChange={v => updateField('lhs', v)} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11 }}>RHS</span>
            {(value.operator === 'and' || value.operator === 'or') && <button onClick={() => toggleNested('rhs')} style={{ background: '#333', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>{typeof value.rhs === 'string' ? 'Nest' : 'Plain'}</button>}
          </div>
          {typeof value.rhs === 'string' ? (
            <input value={value.rhs} onChange={e => updateField('rhs', e.target.value)} placeholder="rhs" style={{ width: '100%', background: '#181818', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '4px 6px', fontSize: 11 }} />
          ) : (
            <ConditionEditor value={value.rhs} onChange={v => updateField('rhs', v)} />
          )}
        </div>
      </div>
    </div>
  );
}

function RootEditor({ root, onChange, onClose }) {
  const update = (field, val) => onChange({ ...root, [field]: val });
  const updateLimit = (idx, lim) => {
    const copy = root.limits.map((l,i) => i===idx?lim:l);
    update('limits', copy);
  };
  const addLimit = () => {
    update('limits', [...root.limits, { condition: defaultCondition(), threshold: 1, interval_seconds: 60 }]);
  };
  const removeLimit = (idx) => {
    if (!window.confirm('Delete this limit?')) return;
    update('limits', root.limits.filter((_,i)=>i!==idx));
  };
  const limitKeyArr = normalizeLimitKey(root.limit_key);
  const setLimitKeyIndex = (i, val) => {
    const arr = [...limitKeyArr];
    arr[i] = val;
    update('limit_key', arr);
  };
  const addLimitKey = () => update('limit_key', [...limitKeyArr, 'key']);
  const removeLimitKey = (i) => update('limit_key', limitKeyArr.filter((_,idx)=>idx!==i));
  return (
    <div style={{ background: '#181818', color: '#eee', border: '1px solid #444', padding: 12, borderRadius: 8, maxWidth: 520 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <strong style={{ fontSize: 13 }}>Editing Root</strong>
        <button onClick={onClose} style={{ background:'#007bff', color:'#fff', border:'none', borderRadius:4, padding:'4px 10px', cursor:'pointer', fontSize:11 }}>Done</button>
      </div>
      <label style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
        <span style={{ fontSize:11 }}>Limit Class</span>
        <select value={root.limit_class} onChange={e=>update('limit_class', e.target.value)} style={{ background:'#202020', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }}>
          {LIMIT_CLASSES.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
        <span style={{ fontSize:11 }}>Name</span>
        <input value={root.name} onChange={e=>update('name', e.target.value)} style={{ background:'#202020', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
      </label>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:8 }}>
        <label style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 200px' }}>
          <span style={{ fontSize:11 }}>URI (regex)</span>
          <input value={root.uri||''} onChange={e=>update('uri', e.target.value)} placeholder="/api/.*" style={{ background:'#202020', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
        </label>
        <label style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
          <span style={{ fontSize:11 }}>Verb (optional)</span>
          <input value={root.verb||''} onChange={e=>update('verb', e.target.value)} placeholder="GET" style={{ background:'#202020', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
        </label>
        <label style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 160px' }}>
          <span style={{ fontSize:11 }}>Short Name</span>
          <input value={root.short_name||''} onChange={e=>update('short_name', e.target.value)} placeholder="identifier" style={{ background:'#202020', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
        </label>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, marginBottom:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Limit Key Parts ({limitKeyArr.length})</span>
          <button onClick={addLimitKey} style={{ background:'#333', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'3px 8px', fontSize:10, cursor:'pointer' }}>Add Key</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {limitKeyArr.map((k,i)=> (
            <div key={i} style={{ display:'flex', gap:6 }}>
              <input value={k} onChange={e=>setLimitKeyIndex(i, e.target.value)} style={{ flex:1, background:'#202020', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
              <button onClick={()=>removeLimitKey(i)} style={{ background:'#553333', color:'#fff', border:'1px solid #774444', borderRadius:4, padding:'4px 6px', fontSize:10, cursor:'pointer' }}>−</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontSize:11 }}>Limits ({root.limits.length})</span>
          <button onClick={addLimit} style={{ background:'#333', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'3px 8px', fontSize:10, cursor:'pointer' }}>Add Limit</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {root.limits.map((lim, idx) => (
            <div key={idx} style={{ background:'#202020', border:'1px solid #333', padding:8, borderRadius:6 }}>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:6 }}>
                <label style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
                  <span style={{ fontSize:11 }}>Threshold</span>
                  <input type="number" value={lim.threshold} onChange={e=>updateLimit(idx,{ ...lim, threshold: parseInt(e.target.value||'0',10) })} style={{ background:'#181818', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 140px' }}>
                  <span style={{ fontSize:11 }}>Interval (s)</span>
                  <input type="number" value={lim.interval_seconds} onChange={e=>updateLimit(idx,{ ...lim, interval_seconds: parseInt(e.target.value||'0',10) })} style={{ background:'#181818', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'4px 6px', fontSize:11 }} />
                </label>
                <div style={{ display:'flex', alignItems:'flex-start' }}>
                  <button onClick={()=>removeLimit(idx)} style={{ marginTop:18, background:'#553333', color:'#fff', border:'1px solid #774444', borderRadius:4, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>Delete</button>
                </div>
              </div>
              <ConditionEditor value={lim.condition} onChange={c=>updateLimit(idx,{ ...lim, condition: c })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LimitsEditor() {
  const [roots, setRoots] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const proxyBase = (process.env.proxy || process.env.REACT_APP_PROXY || '').replace(/\/$/, '');
  const flowRef = useRef(null);
  const [fitFlag, setFitFlag] = useState(false);

  const rebuildNodes = (data) => {
    setNodes(data.map((r,i)=> buildNode(r,i,editingId, { onEdit: (idx)=>setEditingId(String(idx)), onDelete: handleDelete }, { x: NODE_X_START + (i % 4) * NODE_X_GAP, y: NODE_Y_START + Math.floor(i / 4) * NODE_Y_GAP } )));
  };

  useEffect(()=> { rebuildNodes(roots); }, [roots, editingId]);

  useEffect(()=> { if (fitFlag && flowRef.current) { requestAnimationFrame(()=>{ try{ flowRef.current.fitView({ padding:0.2 }); }catch{} setFitFlag(false); }); } }, [fitFlag]);

  const handleAddRoot = () => {
    setRoots(prev => [defaultRoot(prev.length), ...prev]);
    setEditingId('0');
    setIsDirty(true);
    setFitFlag(true);
  };

  const handleDelete = (index) => {
    setEditingId(null);
    setRoots(prev => prev.filter((_,i)=>i!==index));
    setIsDirty(true);
    setFitFlag(true);
  };

  const applyRootChange = (index, updated) => {
    setRoots(prev => prev.map((r,i)=> i===index?updated:r));
    setIsDirty(true);
  };

  const handleLoadInternal = () => {
    setLoading(true); setLoadError(null);
    fetch(proxyBase ? `${proxyBase}/api/v1/limits` : '/api/v1/limits')
      .then(res => { if (res.status===404) return []; if(!res.ok) throw new Error(`Load failed ${res.status}`); return res.json(); })
      .then(data => { if (Array.isArray(data)) { setRoots(data); setEditingId(null); setIsDirty(false); setFitFlag(true); } else setLoadError('Unexpected limits format'); })
      .catch(err => { setLoadError(err.message||'Failed to load'); })
      .finally(()=> setLoading(false));
  };

  const handleReload = () => {
    if (isDirty) {
      if (window.confirm('Unsaved changes. Save before reload?')) { handleSave(()=>handleLoadInternal()); return; }
      setIsDirty(false);
    }
    handleLoadInternal();
  };

  const handleSave = (after) => {
    setSaveLoading(true); setSaveError(null);
    fetch(proxyBase ? `${proxyBase}/api/v1/limits` : '/api/v1/limits', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(roots)
    }).then(res => { if(!res.ok) throw new Error(`Save failed ${res.status}`); return res.json(); })
      .then(json => { alert(`Saved ${json.saved_roots} roots.`); setIsDirty(false); if(after) after(); })
      .catch(err => setSaveError(err.message||'Failed to save') )
      .finally(()=> setSaveLoading(false));
  };

  useEffect(()=> { handleLoadInternal(); }, []);

  // Filtering (non-structural; rebuild nodes subset)
  const filteredRoots = roots.filter(r => {
    if (filterName && !r.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterClass && r.limit_class !== filterClass) return false;
    return true;
  });

  useEffect(()=> {
    // If editing node filtered out, exit edit
    if (editingId && !filteredRoots.some((r,i)=> String(i)===editingId)) setEditingId(null);
    const mapped = filteredRoots.map((r, orderIdx) => buildNode(r, roots.indexOf(r), editingId, { onEdit:(idx)=>setEditingId(String(idx)), onDelete: handleDelete }, { x: NODE_X_START + (orderIdx % 4) * NODE_X_GAP, y: NODE_Y_START + Math.floor(orderIdx / 4) * NODE_Y_GAP }));
    setNodes(mapped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterName, filterClass, roots, editingId]);

  const onNodesChange = changes => setNodes(nds => applyNodeChanges(changes, nds));

  return (
    <div style={{ marginTop:24 }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        <input placeholder="Filter by name" value={filterName} onChange={e=>setFilterName(e.target.value)} style={{ background:'#222', color:'#eee', border:'1px solid #444', borderRadius:4, padding:'6px 10px', minWidth:160 }} />
        <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} style={{ background:'#222', color:'#eee', border:'1px solid #444', borderRadius:4, padding:'6px 10px' }}>
          <option value=''>All Classes</option>
          {LIMIT_CLASSES.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterName || filterClass) && <button onClick={()=>{ setFilterName(''); setFilterClass(''); }} style={{ background:'#444', color:'#eee', border:'1px solid #555', borderRadius:4, padding:'6px 14px', cursor:'pointer' }}>Clear Filters</button>}
        <button onClick={handleReload} disabled={loading} style={{ background:'#333', color:'#eee', border:'1px solid #444', borderRadius:4, padding:'6px 14px', cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>{loading?'Loading...':'Reload'}</button>
        <button onClick={()=>handleSave()} disabled={saveLoading || !isDirty} style={{ background:isDirty?'#333':'#222', color:'#eee', border:'1px solid #444', borderRadius:4, padding:'6px 14px', cursor:(saveLoading||!isDirty)?'not-allowed':'pointer', opacity:(saveLoading||!isDirty)?0.5:1 }}>{saveLoading?'Saving...':(isDirty?'Save *':'Save')}</button>
        <button onClick={handleAddRoot} style={{ background:'#007bff', color:'#fff', border:'none', borderRadius:4, padding:'6px 14px', cursor:'pointer' }}>Add Limit</button>
        <button onClick={()=> setFitFlag(true)} style={{ background:'#555', color:'#eee', border:'1px solid #444', borderRadius:4, padding:'6px 14px', cursor:'pointer' }}>Fit</button>
      </div>
      {isDirty && <div style={{ color:'#ffa64d', fontSize:11, marginBottom:6 }}>Unsaved changes.</div>}
      {loadError && <div style={{ color:'#ff6b6b', fontSize:12, marginBottom:6 }}>Load Error: {loadError}</div>}
      {saveError && <div style={{ color:'#ff9090', fontSize:12, marginBottom:6 }}>Save Error: {saveError}</div>}
      <div style={{ height:560, border:'1px solid #333', borderRadius:10, overflow:'hidden', background:'#181818', position:'relative' }}>
        {editingId !== null && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', maxHeight:'90%', maxWidth:'90%', overflowY:'auto', zIndex:4000 }}>
            <RootEditor root={roots[Number(editingId)]} onChange={r=>applyRootChange(Number(editingId), r)} onClose={()=>setEditingId(null)} />
          </div>
        )}
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            style={{ background:'#181818', width:'100%' }}
            onInit={(inst)=>{ flowRef.current = inst; setFitFlag(true);} }
            onNodesChange={onNodesChange}
            onNodeDoubleClick={(_, node)=> setEditingId(node.id)}
            onPaneClick={()=> setEditingId(null)}
          >
            <Background color="#333" gap={18} />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

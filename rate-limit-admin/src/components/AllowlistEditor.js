import React, { useState, useEffect, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, Background, Controls, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';

// Data shape contract:
// { limit_class: 'allowlist', verb: string|array, name: string, uri: string }
// Load/Save stubs will later integrate with backend or local file.

const ALLOWED_VERBS = ['GET','POST','PUT','DELETE','HEAD'];
const DEFAULT_ENTRY = { limit_class: 'allowlist', verb: 'GET', name: 'example', uri: '/api/example' };
const NODE_X = 40; // vertical stack x position
const NODE_Y_START = 40;
const NODE_Y_GAP = 160;

function buildNode(entry, index, editingId, handleVerbChange, handleTextChange, exitEdit, existingPosition, handleDelete) {
  const isEditing = editingId === String(index);
  const verbDisplay = entry.verb === undefined ? 'ANY' : (Array.isArray(entry.verb) ? entry.verb.join(', ') : entry.verb);
  return {
    id: String(index),
    type: 'plain',
    position: existingPosition || { x: NODE_X, y: NODE_Y_START + index * NODE_Y_GAP },
    data: {
      isEditing,
      entry,
      verbDisplay,
      handleVerbChange,
      handleTextChange,
      exitEdit,
      handleDelete,
      index
    },
    draggable: true,
    style: { background: 'transparent', border: 'none', cursor: 'pointer', zIndex: isEditing ? 1000 : 0 }
  };
}

// Custom node component without handles
const PlainNode = ({ data }) => {
  const { isEditing, entry: e, verbDisplay, handleVerbChange, handleTextChange, exitEdit, handleDelete, index } = data;
  return (
    <div style={{
      background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 8,
      padding: 10, minWidth: 230, fontSize: 12, position: 'relative', zIndex: isEditing ? 1001 : 'auto', boxShadow: isEditing ? '0 0 12px 4px rgba(0,123,255,0.6)' : 'none'
    }}>
      {!isEditing && (
        <button
          onClick={() => { if (window.confirm(`Delete allowlist entry "${e.name}"?`)) handleDelete(index); }}
          title="Delete entry"
          style={{ position: 'absolute', top: 4, right: 4, background: '#441111', color: '#fff', border: '1px solid #662222', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', lineHeight: '18px', fontSize: 12, padding: 0 }}
        >×</button>
      )}
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold' }}>Editing Entry</div>
            <button
              onClick={() => { if (window.confirm(`Delete allowlist entry "${e.name}"?`)) handleDelete(index); }}
              style={{ background: '#991f1f', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
            >Delete</button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Name</span>
            <input
              style={{ background: '#181818', color: '#f5f5f5', border: '1px solid #555', borderRadius: 4, padding: '4px 6px' }}
              value={e.name}
              autoFocus
              onChange={(evt) => handleTextChange(index, 'name', evt.target.value)}
              onKeyDown={(evt) => { if (evt.key === 'Enter' || evt.key === 'Escape') exitEdit(); }}
            />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Verb(s)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input type="checkbox" checked={e.verb === undefined} onChange={() => handleVerbChange(index, '__ANY__')} /> ANY
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
                {ALLOWED_VERBS.map(v => {
                  const selected = e.verb !== undefined && (Array.isArray(e.verb) ? e.verb.includes(v) : e.verb === v);
                  return (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, opacity: e.verb === undefined ? 0.4 : 1 }}>
                      <input
                        type="checkbox"
                        disabled={e.verb === undefined}
                        checked={selected}
                        onChange={() => handleVerbChange(index, v)}
                      /> {v}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>URI</span>
            <input
              style={{ background: '#181818', color: '#f5f5f5', border: '1px solid #555', borderRadius: 4, padding: '4px 6px' }}
              value={e.uri}
              onChange={(evt) => handleTextChange(index, 'uri', evt.target.value)}
              onKeyDown={(evt) => { if (evt.key === 'Enter' || evt.key === 'Escape') exitEdit(); }}
            />
          </label>
          <div style={{ fontSize: 10, color: '#aaa' }}>limit_class: allowlist</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
              onClick={exitEdit}
            >Done</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{e.name}</div>
          <div>Verb: {verbDisplay}</div>
          <div>URI: {e.uri}</div>
        </div>
      )}
    </div>
  );
};

// Node types map without handles
const nodeTypes = { plain: PlainNode };

export default function AllowlistEditor() {
  const [entries, setEntries] = useState([DEFAULT_ENTRY]);
  const [editingId, setEditingId] = useState(null);
  const [nodes, setNodes] = useState(() => entries.map((e, i) => buildNode(e, i, editingId, handleVerbChangeStub, handleTextChangeStub, () => setEditingId(null), undefined, handleDeleteStub)));
  const [filterValue, setFilterValue] = useState('');
  const [uriFilterValue, setUriFilterValue] = useState('');
  const [originalPositions, setOriginalPositions] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [shouldAutoArrange, setShouldAutoArrange] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDirty, setIsDirty] = useState(false); // track unsaved changes
  const [useGridLayout, setUseGridLayout] = useState(true); // enable grid by default
  const [gridColumns, setGridColumns] = useState(4); // default 4 columns
  const GRID_X_START = 40;
  const GRID_Y_START = 40;
  const GRID_X_GAP = 260; // horizontal spacing between columns
  const GRID_Y_GAP = 160; // vertical spacing between rows
  const proxyBase = (process.env.proxy || process.env.REACT_APP_PROXY || '').replace(/\/$/, '');
  const flowInstanceRef = useRef(null);
  const [shouldFitView, setShouldFitView] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0); // increments on structural layout changes

  // Temporary stubs for initial nodes build before real handlers are defined; will be replaced below.
  function handleVerbChangeStub() {}
  function handleTextChangeStub() {}
  function handleDeleteStub() {}

  // Initialize original positions on first load if empty
  useEffect(() => {
    if (originalPositions.size === 0) {
      const init = new Map();
      entries.forEach((_, i) => {
        init.set(String(i), { x: NODE_X, y: NODE_Y_START + i * NODE_Y_GAP });
      });
      setOriginalPositions(init);
    }
  }, []);

  // Rebuild nodes when entries change (add/load). Preserve existing positions by id.
  useEffect(() => {
    setNodes(prev => {
      const positionMap = new Map(prev.map(n => [n.id, n.position]));
      return entries.map((e, i) => {
        const pos = useGridLayout ? getGridPos(i) : positionMap.get(String(i));
        return buildNode(e, i, editingId, handleVerbChange, handleTextChange, exitEdit, pos, handleDelete);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, useGridLayout, gridColumns]);

  // Update node data when editingId or entry content changes without resetting positions.
  useEffect(() => {
    setNodes(prev => prev.map(n => {
      const idx = Number(n.id);
      const pos = useGridLayout ? getGridPos(idx) : n.position;
      return buildNode(entries[idx], idx, editingId, handleVerbChange, handleTextChange, exitEdit, pos, handleDelete);
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, useGridLayout, gridColumns]);

  // Rebuild nodes whenever entries or filter change
  useEffect(() => {
    setNodes(prev => {
      const isUnfiltered = filterValue === '' && uriFilterValue === '';
      const nameLower = filterValue.toLowerCase();
      const uriLower = uriFilterValue.toLowerCase();
      const filtered = entries.map((e, i) => ({ e, i })).filter(({ e }) => {
        if (filterValue && !e.name.toLowerCase().includes(nameLower)) return false;
        if (uriFilterValue && !e.uri.toLowerCase().includes(uriLower)) return false;
        return true;
      });
      if (editingId && !filtered.some(f => String(f.i) === editingId)) setEditingId(null);
      const sourceList = (filterValue || uriFilterValue) ? filtered : entries.map((e, i) => ({ e, i }));
      return sourceList.map(({ e, i }, orderIdx) => {
        const pos = useGridLayout ? getGridPos(orderIdx) : { x: NODE_X, y: NODE_Y_START + orderIdx * NODE_Y_GAP };
        return buildNode(e, i, editingId, handleVerbChange, handleTextChange, exitEdit, pos, handleDelete);
      });
    });
    // NOTE: do NOT trigger fitView just for filtering/editing to reduce ResizeObserver churn.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, filterValue, uriFilterValue, useGridLayout, gridColumns]);

  // Add entry handler
  const handleAdd = () => {
    // Prepend a new entry so it appears at the top
    setEntries(prev => {
      const newEntry = { ...DEFAULT_ENTRY, name: `new-${prev.length + 1}` };
      return [newEntry, ...prev];
    });
    // Ensure filters don't hide the new entry
    setFilterValue('');
    setUriFilterValue('');
    // Put the new (top) entry into edit mode
    setEditingId('0');
    // Reset sequential positions so existing entries shift downward
    setOriginalPositions(() => {
      const newMap = new Map();
      // entries.length is old length; new total is entries.length + 1
      for (let i = 0; i < entries.length + 1; i++) {
        newMap.set(String(i), { x: NODE_X, y: NODE_Y_START + i * NODE_Y_GAP });
      }
      return newMap;
    });
    setIsDirty(true);
    setLayoutVersion(v => v + 1);
  };

  const handleLoadInternal = () => {
    setLoading(true);
    setLoadError(null);
    const url = proxyBase ? `${proxyBase}/api/v1/allowlist` : '/api/v1/allowlist';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load allowlist (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setEntries(data);
          setEditingId(null);
          setShouldAutoArrange(true);
          setIsDirty(false);
          setLayoutVersion(v => v + 1);
        } else {
          setLoadError('Unexpected allowlist format');
        }
      })
      .catch(err => {
        console.error('Load error:', err);
        setLoadError(err.message || 'Failed to load allowlist from server');
      })
      .finally(() => setLoading(false));
  };
  const handleLoad = () => {
    if (isDirty) {
      const confirmSave = window.confirm('You have unsaved changes. Press OK to save before reloading, or Cancel to discard changes and reload.');
      if (confirmSave) {
        handleSave(() => handleLoadInternal());
        return;
      }
      // discard changes
      setIsDirty(false);
    }
    handleLoadInternal();
  };

  const handleSave = (afterSave) => {
    setSaveLoading(true);
    setSaveError(null);
    const url = proxyBase ? `${proxyBase}/api/v1/allowlist` : '/api/v1/allowlist';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries)
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to save (${res.status})`);
        return res.json();
      })
      .then(json => {
        alert(`Saved ${json.saved} entries to Redis.`);
        setIsDirty(false); // changes persisted
        if (afterSave) afterSave();
      })
      .catch(err => {
        console.error('Save error:', err);
        setSaveError(err.message || 'Failed to save allowlist');
      })
      .finally(() => setSaveLoading(false));
  };

  const handleTextChange = (index, field, value) => {
    setEntries(prev => {
      const updated = [...prev];
      const entry = { ...updated[index] };
      if (field === 'name') entry.name = value;
      else if (field === 'uri') entry.uri = value;
      updated[index] = entry;
      return updated;
    });
    setIsDirty(true);
  };

  const handleVerbChange = (index, value) => {
    setEntries(prev => {
      const updated = [...prev];
      const entry = { ...updated[index] };
      if (value === '__ANY__') {
        if (entry.verb === undefined) {
          entry.verb = []; // exit ANY -> start selecting
        } else {
          delete entry.verb; // enter ANY
        }
      } else {
        const current = entry.verb === undefined ? [] : (Array.isArray(entry.verb) ? [...entry.verb] : [entry.verb]);
        if (current.includes(value)) {
          const next = current.filter(v => v !== value);
            if (next.length === 0) entry.verb = []; else if (next.length === 1) entry.verb = next[0]; else entry.verb = next;
        } else {
          const next = [...current, value];
          entry.verb = next.length === 1 ? next[0] : next;
        }
      }
      updated[index] = entry;
      return updated;
    });
    setIsDirty(true);
  };

  const handleDelete = (index) => {
    setEditingId(null);
    setEntries(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
    setLayoutVersion(v => v + 1);
  };

  const exitEdit = () => setEditingId(null);

  // When entries mutate (via verb/text change), refresh node data (positions preserved)
  useEffect(() => {
    setNodes(prev => prev.map(n => {
      const idx = Number(n.id);
      const pos = useGridLayout ? getGridPos(idx) : n.position;
      return buildNode(entries[idx], idx, editingId, handleVerbChange, handleTextChange, exitEdit, pos, handleDelete);
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const onNodesChange = changes => {
    setNodes(nds => {
      const updated = applyNodeChanges(changes, nds);
      const isUnfiltered = filterValue === '' && uriFilterValue === '';
      if (isUnfiltered) {
        setOriginalPositions(prevMap => {
          const newMap = new Map(prevMap);
          updated.forEach(n => newMap.set(n.id, n.position));
          return newMap;
        });
      }
      return updated;
    });
  };

  // Helper to compute grid position
  function getGridPos(orderIdx) {
    const col = orderIdx % gridColumns;
    const row = Math.floor(orderIdx / gridColumns);
    return { x: GRID_X_START + col * GRID_X_GAP, y: GRID_Y_START + row * GRID_Y_GAP };
  }

  const arrangeNodes = () => {
    if (useGridLayout) {
      setNodes(prev => prev.map(n => {
        const idx = Number(n.id);
        return { ...n, position: getGridPos(idx) };
      }));
    } else {
      const isUnfiltered = filterValue === '' && uriFilterValue === '';
      if (isUnfiltered) {
        setNodes(prev => prev.map((n, i) => ({ ...n, position: { x: NODE_X, y: NODE_Y_START + i * NODE_Y_GAP } })));
        setOriginalPositions(() => {
          const newMap = new Map();
          entries.forEach((_, i) => newMap.set(String(i), { x: NODE_X, y: NODE_Y_START + i * NODE_Y_GAP }));
          return newMap;
        });
      } else {
        setNodes(prev => prev.map((n, idx) => ({ ...n, position: { x: NODE_X, y: NODE_Y_START + idx * NODE_Y_GAP } })));
      }
    }
    setLayoutVersion(v => v + 1);
    setShouldFitView(true);
  };

  // Auto-load on initial mount (only once)
  useEffect(() => {
    handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-arrange after reload
  useEffect(() => {
    if (shouldAutoArrange) {
      arrangeNodes();
      setShouldAutoArrange(false);
      setShouldFitView(true);
    }
  }, [shouldAutoArrange, entries]);

  // Trigger fitView only when flagged, to avoid ResizeObserver warning loops
  useEffect(() => {
    if (shouldFitView && flowInstanceRef.current) {
      // Double rAF to allow layout/scrollbars to settle
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { flowInstanceRef.current.fitView({ padding: 0.2, includeHiddenNodes: true }); } catch(_){}
        setShouldFitView(false);
      }));
    }
  }, [shouldFitView]);

  // Re-fit only when structural layout changes (not for filter typing)
  useEffect(() => { setShouldFitView(true); }, [layoutVersion]);
  // Grid toggle / column change are structural: bump version
  useEffect(() => { setLayoutVersion(v => v + 1); }, [useGridLayout, gridColumns]);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Filter by name (case-insensitive)"
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          style={{ background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', minWidth: 220 }}
        />
        <input
          placeholder="Filter by URI (case-insensitive)"
          value={uriFilterValue}
          onChange={e => setUriFilterValue(e.target.value)}
          style={{ background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', minWidth: 220 }}
        />
        {(filterValue || uriFilterValue) && (
          <button onClick={() => { setFilterValue(''); setUriFilterValue(''); }} style={{ background: '#444', color: '#f5f5f5', border: '1px solid #555', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Clear Filters</button>
        )}
        <button onClick={handleLoad} disabled={loading} style={{ background: '#333', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading...' : 'Reload'}
        </button>
        <button onClick={() => handleSave()} disabled={saveLoading || !isDirty} style={{ background: isDirty ? '#333' : '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 14px', cursor: (saveLoading || !isDirty) ? 'not-allowed' : 'pointer', opacity: (saveLoading || !isDirty) ? 0.5 : 1 }}>
          {saveLoading ? 'Saving...' : (isDirty ? 'Save *' : 'Save')}
        </button>
        <button onClick={handleAdd} style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Add Entry</button>
        <button onClick={arrangeNodes} style={{ background: '#555', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Arrange</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ddd' }}>
          <input type="checkbox" checked={useGridLayout} onChange={() => setUseGridLayout(v => !v)} /> Grid
        </label>
        {useGridLayout && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ddd' }}>
            Columns:
            <input
              type="number"
              min={1}
              max={12}
              value={gridColumns}
              onChange={e => setGridColumns(() => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val)) return 1;
                return Math.max(1, Math.min(12, val));
              })}
              style={{ width: 60, background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
            />
          </label>
        )}
      </div>
      {isDirty && <div style={{ color: '#ffa64d', fontSize: 11, marginBottom: 4 }}>You have unsaved changes.</div>}
      {loadError && (
        <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 8 }}>Error: {loadError}</div>
      )}
      {saveError && (
        <div style={{ color: '#ff9090', fontSize: 12, marginBottom: 6 }}>Save Error: {saveError}</div>
      )}
      <div style={{ height: 520, border: '1px solid #333', borderRadius: 10, overflow: 'hidden', background: '#181818' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            style={{ background: '#181818', width: '100%' }}
            onInit={(instance) => { flowInstanceRef.current = instance; setShouldFitView(true); }}
            onNodesChange={onNodesChange}
            onNodeDoubleClick={(_, node) => setEditingId(node.id)}
            onPaneClick={exitEdit}
          >
            <Background color="#333" gap={18} />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

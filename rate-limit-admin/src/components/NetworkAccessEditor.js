import React, { useState, useEffect, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, Background, Controls, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';

/* Data shape (raw): {
 *   "1": ["127.0.0.1", "192.168.0.0/16"],
 *   "6": ["130.212.16.212"]
 * }
 * Internal working array: [{ accountId: string, ips: string[] }]
 * Source: Redis key account_id_network_allowlist
 */

const NODE_X = 40;
const NODE_Y_START = 40;
const NODE_Y_GAP = 180;
const GRID_X_START = 40;
const GRID_Y_START = 40;
const GRID_X_GAP = 260; // horizontal spacing
const GRID_Y_GAP = 180; // vertical spacing

function toArray(mapObj) {
  return Object.entries(mapObj || {}).map(([k, v]) => ({ accountId: k, ips: Array.isArray(v) ? v : [] }));
}

function toMap(arr) {
  return arr.reduce((acc, e) => { acc[e.accountId] = e.ips; return acc; }, {});
}

function buildNode(entry, index, editingId, handlers, existingPosition) {
  const isEditing = editingId === String(index);
  return {
    id: String(index),
    type: 'plain',
    position: existingPosition || { x: NODE_X, y: NODE_Y_START + index * NODE_Y_GAP },
    data: { entry, index, isEditing, ...handlers },
    draggable: true,
    style: { background: 'transparent', border: 'none', cursor: 'pointer', zIndex: isEditing ? 1000 : 0 }
  };
}

const PlainNode = ({ data }) => {
  const { entry, index, isEditing, onDelete, onFieldChange, onIpChange, onAddIp, onRemoveIp, exitEdit } = data;
  return (
    <div style={{
      background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 8,
      padding: 10, minWidth: 300, fontSize: 12, position: 'relative', zIndex: isEditing ? 1001 : 'auto', boxShadow: isEditing ? '0 0 12px 4px rgba(0,123,255,0.6)' : 'none'
    }}>
      {!isEditing && (
        <button
          onClick={() => { if (window.confirm(`Delete account ${entry.accountId}?`)) onDelete(index); }}
          title="Delete entry"
          style={{ position: 'absolute', top: 4, right: 4, background: '#441111', color: '#fff', border: '1px solid #662222', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', lineHeight: '18px', fontSize: 12, padding: 0 }}
        >×</button>
      )}
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold' }}>Editing Account</div>
            <button
              onClick={() => { if (window.confirm(`Delete account ${entry.accountId}?`)) onDelete(index); }}
              style={{ background: '#991f1f', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
            >Delete</button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Account ID</span>
            <input
              style={{ background: '#181818', color: '#f5f5f5', border: '1px solid #555', borderRadius: 4, padding: '4px 6px' }}
              value={entry.accountId}
              onChange={e => onFieldChange(index, 'accountId', e.target.value)}
              autoFocus
            />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>IP Addresses / CIDRs</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entry.ips.map((ip, ipIdx) => (
                <div key={ipIdx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    style={{ flex: 1, background: '#181818', color: '#f5f5f5', border: '1px solid #555', borderRadius: 4, padding: '4px 6px' }}
                    value={ip}
                    onChange={e => onIpChange(index, ipIdx, e.target.value)}
                  />
                  <button
                    onClick={() => onRemoveIp(index, ipIdx)}
                    style={{ background: '#553333', color: '#fff', border: '1px solid #774444', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 11 }}
                  >−</button>
                </div>
              ))}
              <button
                onClick={() => onAddIp(index)}
                style={{ alignSelf: 'flex-start', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
              >Add IP</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
              onClick={exitEdit}
            >Done</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Account {entry.accountId}</div>
          <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 11 }}>
            {entry.ips.length === 0 && <div style={{ fontStyle: 'italic', color: '#999' }}>No IPs</div>}
            {entry.ips.map((ip, i) => (
              <div key={i}>{ip}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const nodeTypes = { plain: PlainNode };

export default function NetworkAccessEditor() {
  const [entries, setEntries] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterIp, setFilterIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [useGridLayout, setUseGridLayout] = useState(true);
  const [gridColumns, setGridColumns] = useState(4);
  const proxyBase = (process.env.proxy || process.env.REACT_APP_PROXY || '').replace(/\/$/, '');
  const flowInstanceRef = useRef(null);
  const [shouldFitView, setShouldFitView] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0); // structural layout mutations counter
  const containerRef = useRef(null);

  const handlers = {
    onDelete: (idx) => {
      setEditingId(null);
      setEntries(prev => prev.filter((_, i) => i !== idx));
      setIsDirty(true);
    },
    onFieldChange: (idx, field, value) => {
      setEntries(prev => {
        const copy = [...prev];
        const e = { ...copy[idx] };
        if (field === 'accountId') e.accountId = value;
        copy[idx] = e;
        return copy;
      });
      setIsDirty(true);
    },
    onIpChange: (idx, ipIdx, value) => {
      setEntries(prev => {
        const copy = [...prev];
        const e = { ...copy[idx], ips: [...copy[idx].ips] };
        e.ips[ipIdx] = value;
        copy[idx] = e;
        return copy;
      });
      setIsDirty(true);
    },
    onAddIp: (idx) => {
      setEntries(prev => {
        const copy = [...prev];
        const e = { ...copy[idx], ips: [...copy[idx].ips, ''] };
        copy[idx] = e;
        return copy;
      });
      setIsDirty(true);
    },
    onRemoveIp: (idx, ipIdx) => {
      setEntries(prev => {
        const copy = [...prev];
        const e = { ...copy[idx], ips: copy[idx].ips.filter((_, i) => i !== ipIdx) };
        copy[idx] = e;
        return copy;
      });
      setIsDirty(true);
    },
    exitEdit: () => setEditingId(null)
  };

  useEffect(() => {
    const acctFilter = filterAccount.trim().toLowerCase();
    const ipFilter = filterIp.trim().toLowerCase();
    const filtered = entries.map((e, i) => ({ e, i })).filter(({ e }) => {
      if (acctFilter && !e.accountId.toLowerCase().includes(acctFilter)) return false;
      if (ipFilter && !e.ips.some(ip => ip.toLowerCase().includes(ipFilter))) return false;
      return true;
    });
    if (editingId && !filtered.some(f => String(f.i) === editingId)) setEditingId(null);
    setNodes(filtered.map(({ e, i }, orderIdx) => {
      const pos = useGridLayout ? getGridPos(orderIdx) : { x: NODE_X, y: NODE_Y_START + orderIdx * NODE_Y_GAP };
      return buildNode(e, i, editingId, handlers, pos);
    }));
    // NOTE: do not set shouldFitView here; filtering shouldn't refit to avoid ResizeObserver loops.
  }, [entries, editingId, filterAccount, filterIp, useGridLayout, gridColumns]);

  const onNodesChange = changes => setNodes(nds => applyNodeChanges(changes, nds));

  const handleAdd = () => {
    setEntries(prev => [{ accountId: 'new', ips: [] }, ...prev]);
    setEditingId('0');
    setIsDirty(true);
    setLayoutVersion(v => v + 1);
  };

  const handleLoadInternal = () => {
    setLoading(true);
    setLoadError(null);
    const url = proxyBase ? `${proxyBase}/api/v1/network-access` : '/api/v1/network-access';
    fetch(url)
      .then(res => {
        if (res.status === 404) return { __empty__: true };
        if (!res.ok) throw new Error(`Failed to load network access (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (data.__empty__) {
          setEntries([]);
          setEditingId(null);
          setIsDirty(false);
          setLayoutVersion(v => v + 1);
          return;
        }
        if (typeof data !== 'object' || data == null || Array.isArray(data)) {
          setLoadError('Unexpected network access format');
          return;
        }
        setEntries(toArray(data));
        setEditingId(null);
        setIsDirty(false);
        setLayoutVersion(v => v + 1);
      })
      .catch(err => {
        console.error('Network access load error:', err);
        setLoadError(err.message || 'Failed to load network access');
      })
      .finally(() => setLoading(false));
  };

  const handleReload = () => {
    if (isDirty) {
      const confirmSave = window.confirm('You have unsaved changes. Press OK to save before reloading, or Cancel to discard changes and reload.');
      if (confirmSave) {
        handleSave(() => handleLoadInternal());
        return;
      }
      setIsDirty(false);
    }
    handleLoadInternal();
  };

  const handleSave = (afterSave) => {
    setSaveLoading(true);
    setSaveError(null);
    const url = proxyBase ? `${proxyBase}/api/v1/network-access` : '/api/v1/network-access';
    const payload = toMap(entries);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to save (${res.status})`);
        return res.json();
      })
      .then(json => {
        alert(`Saved ${json.saved_keys} account entries to Redis.`);
        setIsDirty(false);
        if (afterSave) afterSave();
      })
      .catch(err => {
        console.error('Network access save error:', err);
        setSaveError(err.message || 'Failed to save network access');
      })
      .finally(() => setSaveLoading(false));
  };

  useEffect(() => { handleLoadInternal(); /* initial mount */ }, []);
  useEffect(() => { setLayoutVersion(v => v + 1); }, [useGridLayout, gridColumns]);
  useEffect(() => { setShouldFitView(true); }, [layoutVersion]);
  useEffect(() => {
    if (shouldFitView && flowInstanceRef.current) {
      // Only fit if container visible with size
      const el = containerRef.current;
      if (!el || el.offsetWidth === 0 || el.offsetHeight === 0 || document.hidden) {
        // Retry on next frame if hidden
        requestAnimationFrame(() => setShouldFitView(true));
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { flowInstanceRef.current.fitView({ padding: 0.2 }); } catch(_){}
        setShouldFitView(false);
      }));
    }
  }, [shouldFitView]);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = 'You have unsaved network access changes that will be lost.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function getGridPos(orderIdx) {
    const col = orderIdx % gridColumns;
    const row = Math.floor(orderIdx / gridColumns);
    return { x: GRID_X_START + col * GRID_X_GAP, y: GRID_Y_START + row * GRID_Y_GAP };
  }

  const arrangeNodes = () => {
    setNodes(prev => prev.map((n, idx) => {
      const pos = useGridLayout ? getGridPos(idx) : { x: NODE_X, y: NODE_Y_START + idx * NODE_Y_GAP };
      return { ...n, position: pos };
    }));
    setLayoutVersion(v => v + 1);
    setShouldFitView(true);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          placeholder="Filter by Account ID"
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
          style={{ background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', minWidth: 160 }}
        />
        <input
          placeholder="Filter by IP substring"
          value={filterIp}
          onChange={e => setFilterIp(e.target.value)}
          style={{ background: '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', minWidth: 180 }}
        />
        {(filterAccount || filterIp) && (
          <button onClick={() => { setFilterAccount(''); setFilterIp(''); }} style={{ background: '#444', color: '#f5f5f5', border: '1px solid #555', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Clear Filters</button>
        )}
        <button onClick={handleReload} disabled={loading} style={{ background: '#333', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading...' : 'Reload'}
        </button>
        <button onClick={() => handleSave()} disabled={saveLoading || !isDirty} style={{ background: isDirty ? '#333' : '#222', color: '#f5f5f5', border: '1px solid #444', borderRadius: 4, padding: '6px 14px', cursor: (saveLoading || !isDirty) ? 'not-allowed' : 'pointer', opacity: (saveLoading || !isDirty) ? 0.5 : 1 }}>
          {saveLoading ? 'Saving...' : (isDirty ? 'Save *' : 'Save')}
        </button>
        <button onClick={handleAdd} style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Add Account</button>
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
      {loadError && <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 8 }}>Error: {loadError}</div>}
      {saveError && <div style={{ color: '#ff9090', fontSize: 12, marginBottom: 8 }}>Save Error: {saveError}</div>}
      {isDirty && <div style={{ color: '#ffa64d', fontSize: 11, marginBottom: 8 }}>You have unsaved changes.</div>}
      <div ref={containerRef} style={{ height: 560, border: '1px solid #333', borderRadius: 10, overflow: 'hidden', background: '#181818' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            style={{ background: '#181818', width: '100%' }}
            onInit={(instance) => { flowInstanceRef.current = instance; setShouldFitView(true); }}
            onNodesChange={onNodesChange}
            onNodeDoubleClick={(_, node) => setEditingId(node.id)}
            onPaneClick={() => setEditingId(null)}
          >
            <Background color="#333" gap={18} />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

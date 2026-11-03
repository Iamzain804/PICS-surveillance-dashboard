import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function CameraProcessingFilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  branches = [],
  cameras = [],
  initialFilters = {}
}) {
  const [selectedBranch, setSelectedBranch] = useState(initialFilters.branch || 'all');
  const [selectedCamera, setSelectedCamera] = useState(initialFilters.camera || 'all');
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || 'all');

  // Reset state whenever modal opens with initialFilters
  useEffect(() => {
    if (isOpen) {
      setSelectedBranch(initialFilters.branch || 'all');
      setSelectedCamera(initialFilters.camera || 'all');
      setSelectedStatus(initialFilters.status || 'all');
    }
  }, [isOpen, initialFilters]);

  // Dynamically filter cameras based on selected branch
  const availableCameras = useMemo(() => {
    if (!selectedBranch || selectedBranch === 'all') {
      return cameras;
    }
    return cameras.filter(c => String(c.branch_id) === String(selectedBranch));
  }, [cameras, selectedBranch]);

  // Handle branch change: reset camera if previously selected camera is not in the new branch
  const handleBranchChange = (newBranch) => {
    setSelectedBranch(newBranch);
    if (newBranch !== 'all') {
      const branchCams = cameras.filter(c => String(c.branch_id) === String(newBranch));
      const stillValid = branchCams.some(c => String(c.id) === String(selectedCamera) || String(c.camera_id) === String(selectedCamera) || c.name === selectedCamera);
      if (!stillValid) {
        setSelectedCamera('all');
      }
    }
  };

  const handleApply = (e) => {
    if (e) e.preventDefault();
    onApplyFilters({
      branch: selectedBranch,
      camera: selectedCamera,
      status: selectedStatus
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '620px',
          padding: '1.75rem',
          animation: 'epicFadeIn 0.2s ease-out',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Filter Camera Processing Reports
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.35rem 0 0 0' }}>
              Select filters to generate video processing logs and detection metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '0.4rem',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Row 1: Branch & Camera / Device */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Branch */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                BRANCH
              </label>
              <CustomSelect
                value={selectedBranch}
                onChange={(e) => {
                  const val = e && e.target ? e.target.value : e;
                  handleBranchChange(val);
                }}
                placeholder="Branch"
                options={[
                  { value: 'all', label: 'Branch' },
                  ...branches.map((b) => ({ value: String(b.id), label: b.name }))
                ]}
                style={{ width: '100%' }}
              />
            </div>

            {/* Camera / Device */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                CAMERA / DEVICE
              </label>
              <CustomSelect
                value={selectedCamera}
                onChange={(e) => {
                  const val = e && e.target ? e.target.value : e;
                  setSelectedCamera(val);
                }}
                placeholder="Camera / Device"
                options={[
                  { value: 'all', label: 'Camera / Device' },
                  ...availableCameras.map((c) => ({
                    value: String(c.id || c.name),
                    label: c.name || c.camera_id || `Camera ${c.id}`
                  }))
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 2: Processing Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
              PROCESSING STATUS
            </label>
            <CustomSelect
              value={selectedStatus}
              onChange={(e) => {
                const val = e && e.target ? e.target.value : e;
                setSelectedStatus(val);
              }}
              placeholder="Status"
              options={[
                { value: 'all', label: 'Status' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' }
              ]}
              style={{ width: '100%' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '0.625rem',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.5rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: 'var(--brand-primary, #006EB3)',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--brand-primary-tint, rgba(0, 110, 179, 0.25))'
              }}
            >
              <Search size={15} />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

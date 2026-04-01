export default function CompletionModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '48px 56px',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        maxWidth: 480,
      }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 30, color: '#e67e22', marginBottom: 12 }}>恭喜你已经成功修复城墙！</h2>
        <p style={{ fontSize: 18, color: '#555', marginBottom: 32 }}>太棒了！城墙又变得坚固了！</p>
        <button
          onClick={onClose}
          style={{
            padding: '14px 40px',
            fontSize: 20,
            borderRadius: 12,
            border: 'none',
            background: '#e67e22',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          继续探索 →
        </button>
      </div>
    </div>
  )
}

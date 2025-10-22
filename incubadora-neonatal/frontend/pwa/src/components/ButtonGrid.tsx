const items = [
{ label: "Iniciar monitoreo", desc: "Placeholder: sin acción" },
    { label: "Detener monitoreo", desc: "Placeholder: sin acción" },
    { label: "Encender calefactor", desc: "Placeholder: sin acción" },
    { label: "Apagar calefactor", desc: "Placeholder: sin acción" },
    { label: "Aumentar humedad", desc: "Placeholder: sin acción" },
    { label: "Disminuir humedad", desc: "Placeholder: sin acción" },
    { label: "Calibrar balanza", desc: "Placeholder: sin acción" },
    { label: "Configurar alertas", desc: "Placeholder: sin acción" }
];


export default function ButtonGrid(){
    return (
        <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Controles</div>
            <div className="grid">
                {items.map((it, i) => (
                    <button key={i} className="btn" title={it.desc} onClick={() => { /* sin acción */ }}>
                        {it.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
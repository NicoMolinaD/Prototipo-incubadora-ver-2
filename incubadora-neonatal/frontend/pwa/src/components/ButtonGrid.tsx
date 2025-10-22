const items = [
{ label: "Iniciar monitoreo", desc: "Placeholder: sin acci�n" },
    { label: "Detener monitoreo", desc: "Placeholder: sin acci�n" },
    { label: "Encender calefactor", desc: "Placeholder: sin acci�n" },
    { label: "Apagar calefactor", desc: "Placeholder: sin acci�n" },
    { label: "Aumentar humedad", desc: "Placeholder: sin acci�n" },
    { label: "Disminuir humedad", desc: "Placeholder: sin acci�n" },
    { label: "Calibrar balanza", desc: "Placeholder: sin acci�n" },
    { label: "Configurar alertas", desc: "Placeholder: sin acci�n" }
];


export default function ButtonGrid(){
    return (
        <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Controles</div>
            <div className="grid">
                {items.map((it, i) => (
                    <button key={i} className="btn" title={it.desc} onClick={() => { /* sin acci�n */ }}>
                        {it.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
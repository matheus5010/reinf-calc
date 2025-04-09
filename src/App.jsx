
import { useState } from "react";

function App() {
  const [notas, setNotas] = useState([]);
  const [form, setForm] = useState({
    numero: "",
    dataNota: "",
    dataPagamento: "",
    valorTotal: "",
    valorIR: "",
    valorCSRF: "",
    obs: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...form, [name]: value };

    if (name === "valorTotal") {
      const total = parseFloat(value) || 0;
      const ir = total * 0.015;
      const csrf = total * 0.0465;

      updatedForm.valorIR = ir >= 10 ? ir.toFixed(2) : "0.00";
      updatedForm.valorCSRF = csrf >= 10 ? csrf.toFixed(2) : "0.00";
    }

    setForm(updatedForm);
  };

  const adicionarNota = () => {
    setNotas([...notas, form]);
    setForm({
      numero: "",
      dataNota: "",
      dataPagamento: "",
      valorTotal: "",
      valorIR: "",
      valorCSRF: "",
      obs: ""
    });
  };

  const getMesReferencia = (dateStr) => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  const filtrarNotasPorMes = (mesRef) => {
    return notas.filter((n) =>
      getMesReferencia(n.dataNota) === mesRef || getMesReferencia(n.dataPagamento) === mesRef
    );
  };

  const exportarCSV = () => {
    const header = ["Numero", "Data Nota", "Data Pagamento", "Valor Total", "Valor IR", "Valor CSRF", "Observações"];
    const rows = notas.map(n => [n.numero, n.dataNota, n.dataPagamento, n.valorTotal, n.valorIR, n.valorCSRF, n.obs]);
    const csvContent = [header, ...rows]
      .map(e => e.map(v => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reinf_notas.csv");
    link.click();
  };

  const [mesFiltro, setMesFiltro] = useState("");

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Controle EFD-Reinf</h1>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
        <input placeholder="Nº Nota" name="numero" value={form.numero} onChange={handleChange} />
        <input type="date" placeholder="Data da Nota" name="dataNota" value={form.dataNota} onChange={handleChange} />
        <input type="date" placeholder="Data do Pagamento" name="dataPagamento" value={form.dataPagamento} onChange={handleChange} />
        <input placeholder="Valor Total" name="valorTotal" value={form.valorTotal} onChange={handleChange} />
        <input placeholder="Valor IR (1,5%)" name="valorIR" value={form.valorIR} readOnly />
        <input placeholder="Valor CSRF (4,65%)" name="valorCSRF" value={form.valorCSRF} readOnly />
        <textarea placeholder="Observações" name="obs" value={form.obs} onChange={handleChange} />
      </div>
      <button style={{ marginTop: "1rem" }} onClick={adicionarNota}>Adicionar Nota</button>

      <div style={{ marginTop: "2rem" }}>
        <input placeholder="Filtrar por mês (AAAA-MM)" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
        <button onClick={exportarCSV}>Exportar CSV</button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        {filtrarNotasPorMes(mesFiltro).map((n, i) => (
          <div key={i} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <p><strong>Nota:</strong> {n.numero}</p>
            <p><strong>Data da Nota:</strong> {n.dataNota}</p>
            <p><strong>Data do Pagamento:</strong> {n.dataPagamento}</p>
            <p><strong>Valor Total:</strong> R$ {n.valorTotal}</p>
            <p><strong>Valor IR:</strong> R$ {n.valorIR}</p>
            <p><strong>Valor CSRF:</strong> R$ {n.valorCSRF}</p>
            <p><strong>Obs:</strong> {n.obs}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

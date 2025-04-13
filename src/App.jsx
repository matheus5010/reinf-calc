import './App.css';
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

function App() {
  const [notas, setNotas] = useState(() => {
    const dadosSalvos = localStorage.getItem("notas");
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
  });

  const formInicial = {
    numero: "",
    dataNota: "",
    dataPagamento: "",
    valorTotal: "",
    valorIR: "",
    valorCSRF: "",
    codServico: "",
    cnpjPrestador: "",
    nomePrestador: "",
    nomeTomador: "",
    prazoPagamento: "",
    obs: ""
  };

  const [form, setForm] = useState(formInicial);
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [mesFiltro, setMesFiltro] = useState("");

  useEffect(() => {
    localStorage.setItem("notas", JSON.stringify(notas));
  }, [notas]);

  const formatarCNPJ = (cnpj) =>
    cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

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

    if (name === "dataNota" || name === "dataPagamento") {
      const dataIR = new Date(updatedForm.dataNota);
      dataIR.setMonth(dataIR.getMonth() + 1);
      dataIR.setDate(20);
      const dataCSRF = new Date(updatedForm.dataPagamento);
      dataCSRF.setMonth(dataCSRF.getMonth() + 1);
      dataCSRF.setDate(20);
      updatedForm.prazoPagamento = `IR: ${dataIR.toLocaleDateString()} | CSRF: ${dataCSRF.toLocaleDateString()}`;
    }

    setForm(updatedForm);
  };

  const adicionarNota = () => {
    const camposObrigatorios = ["numero", "dataNota", "dataPagamento", "valorTotal", "cnpjPrestador"];
    const camposVazios = camposObrigatorios.filter(c => !form[c]);
    if (camposVazios.length > 0) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (editandoIndex !== null) {
      const novasNotas = [...notas];
      novasNotas[editandoIndex] = form;
      setNotas(novasNotas);
      setEditandoIndex(null);
    } else {
      setNotas([...notas, form]);
    }
    setForm(formInicial);
  };

  const editarNota = (index) => {
    setForm(notas[index]);
    setEditandoIndex(index);
  };

  const excluirNota = (index) => {
    const novasNotas = notas.filter((_, i) => i !== index);
    setNotas(novasNotas);
  };

  const filtrarNotasPorMes = (mesRef) => {
    return notas.filter((n) => {
      const dataIR = new Date(n.dataNota);
      dataIR.setMonth(dataIR.getMonth() + 1);
      const mesIR = `${dataIR.getFullYear()}-${(dataIR.getMonth() + 1).toString().padStart(2, "0")}`;
      const dataCSRF = new Date(n.dataPagamento);
      dataCSRF.setMonth(dataCSRF.getMonth() + 1);
      const mesCSRF = `${dataCSRF.getFullYear()}-${(dataCSRF.getMonth() + 1).toString().padStart(2, "0")}`;
      return mesIR === mesRef || mesCSRF === mesRef;
    });
  };

  const somaCampo = (campo) =>
    filtrarNotasPorMes(mesFiltro).reduce((acc, n) => acc + parseFloat(n[campo] || 0), 0);

  const exportarCSV = () => {
    const header = [
      "Numero", "Data Nota", "Data Pagamento", "CNPJ Prestador", "Nome Prestador", "Nome Tomador", "Valor Total",
      "Valor IR", "Valor CSRF", "Código do Serviço", "Prazo Pgto", "Observações"
    ];
    const rows = filtrarNotasPorMes(mesFiltro).map(n => [
      n.numero, n.dataNota, n.dataPagamento, n.cnpjPrestador, n.nomePrestador, n.nomeTomador,
      n.valorTotal, n.valorIR, n.valorCSRF, n.codServico, n.prazoPagamento, n.obs
    ]);
    const csvContent = [header, ...rows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reinf_retencoes_${mesFiltro}.csv`);
    link.click();
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text(`Retenções a pagar - ${mesFiltro}`, 14, 15);
    const dados = filtrarNotasPorMes(mesFiltro).map(n => [
      n.numero, n.dataNota, n.dataPagamento, n.cnpjPrestador, n.nomePrestador, n.nomeTomador,
      n.valorTotal, n.valorIR, n.valorCSRF, n.codServico, n.prazoPagamento, n.obs
    ]);
    doc.autoTable({
      startY: 20,
      head: [[
        "Nº", "Nota", "Pagamento", "CNPJ", "Prestador", "Tomador",
        "Total", "IR", "CSRF", "Serviço", "Prazo", "Obs"
      ]],
      body: dados,
      styles: { fontSize: 8 }
    });
    doc.save(`reinf_retencoes_${mesFiltro}.pdf`);
  };

  return (
    <div className="container">
      <h1>Controle EFD-Reinf</h1>

     <div className="formulario">
  <input placeholder="Nº Nota" name="numero" value={form.numero} onChange={handleChange} />

  <label>
    Data da Nota (Fato Gerador do IR)
    <input type="date" name="dataNota" value={form.dataNota} onChange={handleChange} />
  </label>

  <label>
    Data do Pagamento (Fato Gerador do CSRF)
    <input type="date" name="dataPagamento" value={form.dataPagamento} onChange={handleChange} />
  </label>

  <input placeholder="Valor Total" name="valorTotal" value={form.valorTotal} onChange={handleChange} />
  <input placeholder="CNPJ Prestador" name="cnpjPrestador" value={form.cnpjPrestador} onChange={handleChange} />
  <input placeholder="Nome Prestador" name="nomePrestador" value={form.nomePrestador} onChange={handleChange} />
  <input placeholder="Nome Tomador" name="nomeTomador" value={form.nomeTomador} onChange={handleChange} />
  <input placeholder="Código do Serviço" name="codServico" value={form.codServico} onChange={handleChange} />
  <input placeholder="Prazo Pgto" name="prazoPagamento" value={form.prazoPagamento} readOnly />
  <input placeholder="Valor IR (1,5%)" name="valorIR" value={form.valorIR} readOnly />
  <input placeholder="Valor CSRF (4,65%)" name="valorCSRF" value={form.valorCSRF} readOnly />
  <textarea placeholder="Observações" name="obs" value={form.obs} onChange={handleChange} />
  <button onClick={adicionarNota}>{editandoIndex !== null ? 'Salvar Alteração' : 'Adicionar Nota'}</button>
  <button onClick={() => setForm(formInicial)}>Limpar</button>
</div>

      <div className="filtros">
        <input placeholder="Filtrar por mês (AAAA-MM)" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
        <button onClick={exportarCSV}>Exportar CSV</button>
        <button onClick={exportarPDF}>Exportar PDF</button>
      </div>

      {mesFiltro && (
        <div className="tabela">
          <h2>Notas com impostos a pagar em {mesFiltro}</h2>
          <table>
            <thead>
              <tr>
                <th>Nº Nota</th>
                <th>Data Nota</th>
                <th>Data Pagamento</th>
                <th>CNPJ</th>
                <th>Prestador</th>
                <th>Tomador</th>
                <th>Total</th>
                <th>IR</th>
                <th>CSRF</th>
                <th>Serviço</th>
                <th>Prazo</th>
                <th>Obs</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrarNotasPorMes(mesFiltro).map((n, i) => (
                <tr key={i}>
                  <td>{n.numero}</td>
                  <td>{n.dataNota}</td>
                  <td>{n.dataPagamento}</td>
                  <td>{formatarCNPJ(n.cnpjPrestador)}</td>
                  <td>{n.nomePrestador}</td>
                  <td>{n.nomeTomador}</td>
                  <td>{parseFloat(n.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{parseFloat(n.valorIR).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{parseFloat(n.valorCSRF).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{n.codServico}</td>
                  <td>{n.prazoPagamento}</td>
                  <td>{n.obs}</td>
                  <td>
                    <button onClick={() => editarNota(i)}>Editar</button>
                    <button onClick={() => excluirNota(i)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6">Totais</td>
                <td>{somaCampo("valorTotal").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td>{somaCampo("valorIR").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td>{somaCampo("valorCSRF").toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
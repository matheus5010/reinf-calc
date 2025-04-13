// App.jsx completo com formulário, filtros, ações e tabela visível com botão desfazer
import './App.css';
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function App() {
  const [notas, setNotas] = useState(() => {
    const dadosSalvos = localStorage.getItem("notas");
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
  });

  const [form, setForm] = useState({
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
    empresa: "",
    prazoPagamento: "",
    obs: "",
    status: "Em Aberto"
  });

  const [editandoIndex, setEditandoIndex] = useState(null);
  const [busca, setBusca] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    localStorage.setItem("notas", JSON.stringify(notas));
  }, [notas]);

  const aplicarMascaraCNPJ = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

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

    if (name === "cnpjPrestador") {
      updatedForm[name] = aplicarMascaraCNPJ(value);
    }

    setForm(updatedForm);
  };

  const adicionarNota = () => {
    if (editandoIndex !== null) {
      const novasNotas = [...notas];
      novasNotas[editandoIndex] = form;
      setNotas(novasNotas);
      setEditandoIndex(null);
    } else {
      setNotas([...notas, form]);
    }
    setForm({
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
      empresa: "",
      prazoPagamento: "",
      obs: "",
      status: "Em Aberto"
    });
  };

  const editarNota = (index) => {
    setForm(notas[index]);
    setEditandoIndex(index);
  };

  const excluirNota = (index) => {
    const novasNotas = notas.filter((_, i) => i !== index);
    setNotas(novasNotas);
  };

  const marcarComoPago = (index) => {
    const novasNotas = [...notas];
    novasNotas[index].status = "Pago";
    setNotas(novasNotas);
  };

  const desfazerPagamento = (index) => {
    const novasNotas = [...notas];
    novasNotas[index].status = "Em Aberto";
    setNotas(novasNotas);
  };

  const estaVencido = (prazo, status) => {
    if (!prazo || status === "Pago") return false;
    const partes = prazo.match(/\d{2}\/\d{2}\/\d{4}/g);
    if (!partes) return false;
    const dataIR = new Date(partes[0].split("/").reverse().join("-"));
    const dataCSRF = new Date(partes[1].split("/").reverse().join("-"));
    const hoje = new Date();
    return dataIR < hoje || dataCSRF < hoje;
  };

  const filtrarNotas = () => {
    return notas.filter((n) => {
      const dentroData = (!dataInicio || new Date(n.dataNota) >= new Date(dataInicio)) && (!dataFim || new Date(n.dataNota) <= new Date(dataFim));
      const dentroEmpresa = !empresaFiltro || n.empresa?.toLowerCase().includes(empresaFiltro.toLowerCase());
      const dentroStatus = !statusFiltro || n.status === statusFiltro;
      const buscaValida = !busca || Object.values(n).some(v => v?.toLowerCase?.().includes(busca.toLowerCase()));
      return dentroData && dentroEmpresa && dentroStatus && buscaValida;
    });
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Retenções - EFD-Reinf", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${dataInicio || "..."} até ${dataFim || "..."}`, 14, 22);

    const dados = filtrarNotas().map(n => [
      n.numero, n.dataNota, n.dataPagamento, n.empresa, n.nomePrestador, n.valorTotal, n.valorIR, n.valorCSRF, n.status
    ]);

    if (dados.length === 0) {
      alert("Nenhuma nota para exportar!");
      return;
    }

    autoTable(doc, {
      startY: 28,
      head: [["Nº", "Nota", "Pgto", "Empresa", "Prestador", "Valor", "IR", "CSRF", "Status"]],
      body: dados,
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] }
    });

    doc.text("Relatório gerado automaticamente por reinf-calc", 14, doc.lastAutoTable.finalY + 10);
    doc.save(`reinf_retencoes_${Date.now()}.pdf`);
  };

  return (
    <div className="container">
      <h1>Controle EFD-Reinf</h1>

      <div className="formulario">
        <input placeholder="Nº Nota" name="numero" value={form.numero} onChange={handleChange} />
        <input type="date" name="dataNota" value={form.dataNota} onChange={handleChange} />
        <input type="date" name="dataPagamento" value={form.dataPagamento} onChange={handleChange} />
        <input placeholder="Valor Total" name="valorTotal" value={form.valorTotal} onChange={handleChange} />
        <input placeholder="CNPJ Prestador" name="cnpjPrestador" value={form.cnpjPrestador} onChange={handleChange} />
        <input placeholder="Nome Prestador" name="nomePrestador" value={form.nomePrestador} onChange={handleChange} />
        <input placeholder="Nome Tomador" name="nomeTomador" value={form.nomeTomador} onChange={handleChange} />
        <input placeholder="Código Serviço" name="codServico" value={form.codServico} onChange={handleChange} />
        <input placeholder="Empresa" name="empresa" value={form.empresa} onChange={handleChange} />
        <input placeholder="Prazo Pgto" name="prazoPagamento" value={form.prazoPagamento} readOnly />
        <input placeholder="Valor IR" name="valorIR" value={form.valorIR} readOnly />
        <input placeholder="Valor CSRF" name="valorCSRF" value={form.valorCSRF} readOnly />
        <textarea placeholder="Observações" name="obs" value={form.obs} onChange={handleChange} />
        <button onClick={adicionarNota}>{editandoIndex !== null ? "Salvar Alteração" : "Adicionar Nota"}</button>
      </div>

      <div className="filtros">
        <input placeholder="🔍 Buscar geral" value={busca} onChange={e => setBusca(e.target.value)} />
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        <input placeholder="Filtrar empresa" value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)} />
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="Em Aberto">Em Aberto</option>
          <option value="Pago">Pago</option>
        </select>
        <button onClick={exportarPDF}>📄 Exportar PDF</button>
      </div>

      <table className="tabela">
        <thead>
          <tr>
            <th>Nº</th><th>Nota</th><th>Pgto</th><th>Empresa</th><th>Prestador</th><th>Valor</th><th>IR</th><th>CSRF</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtrarNotas().map((n, i) => (
            <tr key={i} style={{ background: n.status === 'Pago' ? '#e0ffe0' : estaVencido(n.prazoPagamento, n.status) ? '#ffe0e0' : 'white' }}>
              <td>{n.numero}</td>
              <td>{n.dataNota}</td>
              <td>{n.dataPagamento}</td>
              <td>{n.empresa}</td>
              <td>{n.nomePrestador}</td>
              <td>{parseFloat(n.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
              <td>{n.valorIR}</td>
              <td>{n.valorCSRF}</td>
              <td>{n.status}</td>
              <td>
                <button onClick={() => editarNota(i)}>✏️</button>
                <button onClick={() => excluirNota(i)}>🗑️</button>
                {n.status !== 'Pago' && <button onClick={() => marcarComoPago(i)}>💰</button>}
                {n.status === 'Pago' && <button onClick={() => desfazerPagamento(i)}>↩️</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
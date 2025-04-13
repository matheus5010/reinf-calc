import './App.css';
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function App() {
  const [notas, setNotas] = useState(() => {
    const dadosSalvos = localStorage.getItem("notas");
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
  });

  const aplicarMascaraCNPJ = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...form };

    if (name === "valorTotal") {
      const total = parseFloat(value) || 0;
      const ir = total * 0.015;
      const csrf = total * 0.0465;
      updatedForm.valorIR = ir >= 10 ? ir.toFixed(2) : "0.00";
      updatedForm.valorCSRF = csrf >= 10 ? csrf.toFixed(2) : "0.00";
    }

    if (name === "dataNota" || name === "dataPagamento") {
      const dataIR = new Date(name === "dataNota" ? value : form.dataNota);
      dataIR.setMonth(dataIR.getMonth() + 1);
      dataIR.setDate(20);

      const dataCSRF = new Date(name === "dataPagamento" ? value : form.dataPagamento);
      dataCSRF.setMonth(dataCSRF.getMonth() + 1);
      dataCSRF.setDate(20);

      updatedForm.prazoPagamento = `IR: ${dataIR.toLocaleDateString()} | CSRF: ${dataCSRF.toLocaleDateString()}`;
    }

    if (name === "cnpjPrestador") {
      updatedForm[name] = aplicarMascaraCNPJ(value);
    } else {
      updatedForm[name] = value;
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

  const filtrarNotasPorMes = (ref) => {
    const refFormatado = ref.replace("/", "-");
    return notas.filter((n) => {
      const dataIR = new Date(n.dataNota);
      dataIR.setMonth(dataIR.getMonth() + 1);
      const mesIR = `${(dataIR.getMonth() + 1).toString().padStart(2, "0")}-${dataIR.getFullYear()}`;
      const anoIR = `${dataIR.getFullYear()}`;

      const dataCSRF = new Date(n.dataPagamento);
      dataCSRF.setMonth(dataCSRF.getMonth() + 1);
      const mesCSRF = `${(dataCSRF.getMonth() + 1).toString().padStart(2, "0")}-${dataCSRF.getFullYear()}`;
      const anoCSRF = `${dataCSRF.getFullYear()}`;

      return (
        mesIR === refFormatado ||
        mesCSRF === refFormatado ||
        anoIR === refFormatado ||
        anoCSRF === refFormatado
      );
    });
  };

  const somaCampo = (campo) =>
    filtrarNotasPorMes(mesFiltro).reduce((acc, n) => acc + parseFloat(n[campo] || 0), 0);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Retenções a pagar - ${mesFiltro?.replace("-", "/") || "Período completo"}`, 14, 15);

    const dados = filtrarNotasPorMes(mesFiltro).map(n => [
      n.numero,
      n.dataNota,
      n.dataPagamento,
      n.cnpjPrestador,
      n.nomePrestador,
      n.nomeTomador,
      parseFloat(n.valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      parseFloat(n.valorIR || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      parseFloat(n.valorCSRF || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      n.codServico,
      n.prazoPagamento,
      n.obs
    ]);

    if (dados.length === 0) {
      alert("Nenhuma nota encontrada para exportar.");
      return;
    }

    doc.autoTable({
      startY: 20,
      head: [[
        "Nº", "Nota", "Pgto", "CNPJ", "Prestador", "Tomador",
        "Total", "IR", "CSRF", "Serviço", "Prazo", "Obs"
      ]],
      body: dados,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133] }
    });

    doc.save(`reinf_retencoes_${mesFiltro?.replace("-", "_") || "completo"}.pdf`);
  };

  const exportarXLSX = () => {
    const dados = filtrarNotasPorMes(mesFiltro).map(n => ({
      "DATA EMISSÃO": n.dataNota,
      "NUMERO DA NOTA": n.numero,
      "CÓDIGO DO SERVIÇO": n.codServico,
      "EMPRESA": n.nomePrestador,
      "CNPJ": n.cnpjPrestador,
      "TOMADOR": n.nomeTomador,
      "VALOR": parseFloat(n.valorTotal),
      "ISENTO": parseFloat(n.valorIR) < 10 && parseFloat(n.valorCSRF) < 10 ? "SIM" : "NÃO",
      "DATA DE PAGAMENTO": n.dataPagamento,
      "IR": parseFloat(n.valorIR),
      "CSLL": "",
      "PIS": "",
      "COFINS": "",
      "ABAIXO DE 10": parseFloat(n.valorIR) < 10 || parseFloat(n.valorCSRF) < 10 ? "SIM" : "",
      "CSRF": "CONCLUIDO",
      "IR STATUS": "CONCLUIDO"
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RETENÇÕES");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `reinf_retencoes_${mesFiltro || "completo"}.xlsx`);
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
        <input placeholder="Filtrar por mês (MM/AAAA)" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
        <button onClick={exportarXLSX}>Exportar XLSX</button>
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
                  <td>{n.cnpjPrestador}</td>
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

import { calcAvaliacoes, calcCRA } from './notas.js';
import { aprovacaoDe, pontosTotaisDe } from './notasStatus.js';

// ---------- conteúdo da planilha ----------
// Cada aba: { nome, colunas: [{ titulo, largura, num }], linhas: [[célula, ...]] } (num = número com 2 casas)

const temNota = (v) => v !== '' && v !== undefined && v !== null && !Number.isNaN(Number(v));
const arred = (n) => Math.round(n * 100) / 100;

export function montarAbasNotas(cursos = []) {
  const resumo = { nome: 'Disciplinas', colunas: [
    { titulo: 'Curso', largura: 24 }, { titulo: 'Período', largura: 16 }, { titulo: 'Disciplina', largura: 32 },
    { titulo: 'Professor', largura: 22 }, { titulo: 'Status', largura: 14 }, { titulo: 'Carga (h)', largura: 10, num: true },
    { titulo: 'Tipo de hora', largura: 16 }, { titulo: 'Pontos obtidos', largura: 14, num: true }, { titulo: 'Pontos avaliados', largura: 15, num: true },
    { titulo: 'Nota (%)', largura: 10, num: true }, { titulo: 'Passa com (%)', largura: 13, num: true }, { titulo: 'Situação', largura: 20 }, { titulo: 'Pontos totais', largura: 13, num: true },
  ], linhas: [] };
  const avaliacoes = { nome: 'Avaliações', colunas: [
    { titulo: 'Curso', largura: 24 }, { titulo: 'Período', largura: 16 }, { titulo: 'Disciplina', largura: 32 },
    { titulo: 'Avaliação', largura: 22 }, { titulo: 'Data', largura: 12 }, { titulo: 'Hora', largura: 8 },
    { titulo: 'Valor', largura: 9, num: true }, { titulo: 'Nota obtida', largura: 12, num: true }, { titulo: 'Aproveitamento (%)', largura: 18, num: true },
  ], linhas: [] };
  const medias = { nome: 'Médias', colunas: [
    { titulo: 'Curso', largura: 24 }, { titulo: 'Período', largura: 16 }, { titulo: 'Tipo de média', largura: 20 },
    { titulo: 'Média (%)', largura: 11, num: true }, { titulo: 'Horas concluídas', largura: 16, num: true },
  ], linhas: [] };

  cursos.forEach((curso) => {
    const todas = [];
    (curso.periodos || []).forEach((p) => {
      let horas = 0;
      (p.disciplinas || []).forEach((d) => {
        todas.push(d);
        if (d.status === 'Concluída') horas += Number(d.cargaHoraria) || 0;
        const { maxTotal, obtidaTotal, percentual } = calcAvaliacoes(d.avaliacoes, d.usarMedia);
        const min = aprovacaoDe(d, p);
        const situacao = maxTotal === 0 ? 'Sem notas' : percentual >= min ? 'Acima do mínimo' : 'Abaixo do mínimo';
        resumo.linhas.push([
          curso.nome || '', p.nome || '', d.nome || '', d.professor || '', d.status || '', Number(d.cargaHoraria) || 0, d.tipoHora || '',
          maxTotal > 0 ? arred(obtidaTotal) : null, maxTotal > 0 ? arred(maxTotal) : null, maxTotal > 0 ? arred(percentual) : null, min, situacao, pontosTotaisDe(d),
        ]);
        (d.avaliacoes || []).forEach((a) => {
          const tem = temNota(a.obtida);
          const valor = temNota(a.max) ? Number(a.max) : null;
          avaliacoes.linhas.push([
            curso.nome || '', p.nome || '', d.nome || '', a.nome || '', a.data || '', a.hora || '', valor,
            tem ? Number(a.obtida) : null, tem && valor > 0 ? arred((Number(a.obtida) / valor) * 100) : null,
          ]);
        });
      });
      const { cra, hasNotas } = calcCRA(p.disciplinas || [], p.tipoMedia, false);
      medias.linhas.push([curso.nome || '', p.nome || '', p.tipoMedia === 'simples' ? 'Aritmética simples' : 'Ponderada pela carga horária', hasNotas ? arred(cra) : null, horas]);
    });
    const geral = calcCRA(todas, 'ponderada', true);
    const horasTotal = todas.filter((d) => d.status === 'Concluída').reduce((s, d) => s + (Number(d.cargaHoraria) || 0), 0);
    medias.linhas.push([curso.nome || '', 'GERAL (concluídas)', 'Ponderada pela carga horária', geral.hasNotas ? arred(geral.cra) : null, horasTotal]);
  });

  return [resumo, avaliacoes, medias];
}

// ---------- gerador de .xlsx (sem bibliotecas) ----------
const enc = new TextEncoder();
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const colLetra = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// ZIP sem compressão ("stored"), suficiente para um .xlsx
function zip(arquivos) {
  const partes = [];
  const central = [];
  let deslocamento = 0;
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  arquivos.forEach(({ nome, dados }) => {
    const nomeB = enc.encode(nome);
    const crc = crc32(dados);
    const cab = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(nomeB.length), ...u16(0)];
    partes.push(Uint8Array.from(cab), nomeB, dados);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dados.length), ...u32(dados.length), ...u16(nomeB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(deslocamento)]), nomeB);
    deslocamento += cab.length + nomeB.length + dados.length;
  });
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(arquivos.length), ...u16(arquivos.length), ...u32(tamCentral), ...u32(deslocamento), ...u16(0)]);
  const todos = [...partes, ...central, fim];
  const saida = new Uint8Array(todos.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  todos.forEach((p) => { saida.set(p, pos); pos += p.length; });
  return saida;
}

const xmlAba = (aba) => {
  const cols = aba.colunas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largura || 14}" customWidth="1"/>`).join('');
  const cel = (v, ref, estilo) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''}><v>${v}</v></c>`;
    return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  const cab = `<row r="1">${aba.colunas.map((c, i) => cel(c.titulo, `${colLetra(i)}1`, 1)).join('')}</row>`;
  const linhas = aba.linhas.map((l, r) => `<row r="${r + 2}">${l.map((v, i) => cel(v, `${colLetra(i)}${r + 2}`, aba.colunas[i]?.num ? 2 : 0)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${cab}${linhas}</sheetData></worksheet>`;
};

export function gerarXlsx(abas) {
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const arquivos = [
    { nome: '[Content_Types].xml', xml: `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { nome: '_rels/.rels', xml: `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nome: 'xl/workbook.xml', xml: `${cab}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${esc(a.nome.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', xml: `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nome: 'xl/styles.xml', xml: `${cab}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    ...abas.map((a, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, xml: xmlAba(a) })),
  ];
  return zip(arquivos.map(({ nome, xml }) => ({ nome, dados: enc.encode(xml) })));
}

export function baixarPlanilhaNotas(cursos) {
  const bytes = gerarXlsx(montarAbasNotas(cursos));
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roti-na-notas-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

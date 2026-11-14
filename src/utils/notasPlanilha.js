import { calcAvaliacoes } from './notas.js';
import { aprovacaoDe } from './notasStatus.js';

// ---------- conteúdo da planilha ----------
// Uma aba por período. Cada aba: { nome, larguras: [...], mesclar: ['A1:E1'], linhas: [{ alt?, c: [{ v, e }] }] }
// v = valor (texto, número ou vazio) e e = nome do estilo (ver ESTILOS).
// Estrutura da aba:
//   1) "Curso — Período"
//   2) cabeçalho: Disciplina | Distribuídos | Obtido | %
//   3) linha preta: nome (carga) + professor, totais da disciplina
//   4) uma linha por avaliação: nome | valor | nota obtida | % | data
//   ... e volta ao cabeçalho (2) para a próxima disciplina.

const temNota = (v) => v !== '' && v !== undefined && v !== null && !Number.isNaN(Number(v));
const arred = (n) => Math.round(n * 100) / 100;
const L = (v, e) => ({ v: v === undefined ? null : v, e });

const dataBr = (data, hora) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '');
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}${hora ? ` ${hora}` : ''}`;
};

// nome de aba válido no Excel: até 31 caracteres, sem []:*?/\ e único
function nomeDeAba(texto, usados) {
  const base = (String(texto || 'Período').replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'Período').slice(0, 31);
  let nome = base, n = 2;
  while (usados.has(nome.toLowerCase())) {
    const suf = ` (${n++})`;
    nome = base.slice(0, 31 - suf.length) + suf;
  }
  usados.add(nome.toLowerCase());
  return nome;
}

// Mesmo critério do app: disciplina vermelha = % obtido abaixo do % de aprovação dela;
// avaliação vermelha = % da avaliação abaixo do % de aprovação da disciplina.
export function abaDoPeriodo(curso, periodo, nome) {
  const linhas = [{ alt: 24, c: [L(`${curso.nome || 'Curso'} — ${periodo.nome || 'Período'}`, 'titulo')] }];
  (periodo.disciplinas || []).forEach((d) => {
    linhas.push({ c: [L('Disciplina', 'cabEsq'), L('Distribuídos', 'cab'), L('Obtido', 'cab'), L('%', 'cab'), L('', 'cab')] });

    const { maxTotal, obtidaTotal, percentual } = calcAvaliacoes(d.avaliacoes, d.usarMedia);
    const aprovacao = aprovacaoDe(d, periodo);
    const discVermelha = maxTotal > 0 && percentual < aprovacao;
    const carga = Number(d.cargaHoraria) > 0 ? ` (${d.cargaHoraria}h)` : '';
    const titulo = `${d.nome || 'Sem nome'}${carga}`;
    const professor = (d.professor || '').trim();
    linhas.push({
      alt: professor ? 32 : 20,
      c: [
        L(professor ? `${titulo}\n${professor}` : titulo, 'pretoTexto'),
        L(arred(maxTotal), 'pretoNum'),
        L(arred(obtidaTotal), discVermelha ? 'pretoNumVerm' : 'pretoNum'),
        L(maxTotal > 0 ? arred(percentual) : null, discVermelha ? 'pretoPctVerm' : 'pretoPct'),
        L('', 'pretoNum'),
      ],
    });

    (d.avaliacoes || []).forEach((a) => {
      const tem = temNota(a.obtida);
      const valor = temNota(a.max) ? Number(a.max) : null;
      const pctAv = tem && valor > 0 ? (Number(a.obtida) / valor) * 100 : null;
      const avVermelha = pctAv !== null && pctAv < aprovacao;
      linhas.push({
        c: [
          L(a.nome || '', 'texto'),
          L(valor, 'num'),
          L(tem ? Number(a.obtida) : null, avVermelha ? 'numVerm' : 'num'),
          L(pctAv !== null ? arred(pctAv) : null, avVermelha ? 'pctVerm' : 'pct'),
          L(dataBr(a.data, a.hora), 'data'),
        ],
      });
    });
  });
  if (!(periodo.disciplinas || []).length) linhas.push({ c: [L('Nenhuma disciplina neste período.', 'texto')] });
  return { nome, larguras: [38, 14, 12, 10, 18], mesclar: ['A1:E1'], linhas };
}

export function montarAbasNotas(cursos = []) {
  const usados = new Set();
  const abas = [];
  cursos.forEach((curso) => {
    (curso.periodos || []).forEach((p) => {
      // se passar de 31 caracteres, encurta o nome do curso e mantém o do período
      const per = String(p.nome || 'Período').slice(0, 20);
      const cur = String(curso.nome || 'Curso').slice(0, Math.max(3, 31 - per.length - 3));
      abas.push(abaDoPeriodo(curso, p, nomeDeAba(`${cur} - ${per}`, usados)));
    });
  });
  if (abas.length === 0) abas.push({ nome: 'Notas', larguras: [40], mesclar: [], linhas: [{ c: [L('Nenhum período cadastrado.', 'texto')] }] });
  return abas;
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

// Estilos (índice em cellXfs, na ordem de styles.xml abaixo)
const ESTILOS = { texto: 0, titulo: 1, cabEsq: 2, cab: 3, pretoTexto: 4, pretoNum: 5, pretoPct: 6, num: 7, pct: 8, data: 9, pretoNumVerm: 10, pretoPctVerm: 11, numVerm: 12, pctVerm: 13 };

const xmlAba = (aba) => {
  const cols = aba.larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const cel = (v, ref, estilo) => {
    const s = ` s="${estilo}"`;
    if (v === null || v === undefined || v === '') return `<c r="${ref}"${s}/>`;
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  const linhas = aba.linhas.map((l, r) => {
    const n = r + 1;
    const alt = l.alt ? ` ht="${l.alt}" customHeight="1"` : '';
    return `<row r="${n}"${alt}>${l.c.map((c, i) => cel(c.v, `${colLetra(i)}${n}`, ESTILOS[c.e] ?? 0)).join('')}</row>`;
  }).join('');
  const mesclar = aba.mesclar?.length ? `<mergeCells count="${aba.mesclar.length}">${aba.mesclar.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${linhas}</sheetData>${mesclar}</worksheet>`;
};

const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<numFmts count="2"><numFmt numFmtId="164" formatCode="0.00"/><numFmt numFmtId="165" formatCode="0.00&quot;%&quot;"/></numFmts>'
  + '<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFF4444"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFDC2626"/><name val="Calibri"/></font></fonts>'
  + '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF000000"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="14">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' // 0 texto
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' // 1 titulo
  + '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' // 2 cabEsq
  + '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 3 cab
  + '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' // 4 pretoTexto
  + '<xf numFmtId="164" fontId="3" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 5 pretoNum
  + '<xf numFmtId="165" fontId="3" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 6 pretoPct
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 7 num
  + '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 8 pct
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 9 data
  + '<xf numFmtId="164" fontId="4" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 10 pretoNumVerm
  + '<xf numFmtId="165" fontId="4" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 11 pretoPctVerm
  + '<xf numFmtId="164" fontId="5" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 12 numVerm
  + '<xf numFmtId="165" fontId="5" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' // 13 pctVerm
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

export function gerarXlsx(abas) {
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const arquivos = [
    { nome: '[Content_Types].xml', xml: `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { nome: '_rels/.rels', xml: `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nome: 'xl/workbook.xml', xml: `${cab}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${esc(a.nome.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', xml: `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nome: 'xl/styles.xml', xml: STYLES_XML },
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

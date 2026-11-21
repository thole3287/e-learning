import JSZip from 'jszip';
import mammoth from 'mammoth';

/**
 * Chuyển đổi một khối Office MathML (<m:oMath>) thành cú pháp LaTeX
 */
export function convertOMathToLatex(mathXml: string): string {
  const getText = (str: string): string => {
    const matches = str.match(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g) || [];
    return matches.map((m) => m.replace(/<\/?m:t[^>]*>/g, '')).join('');
  };

  let xml = mathXml;

  // 1. sPre: prescript cho đồng vị hạt nhân (số khối A trên, số hiệu Z dưới, nguyên tố X)
  xml = xml.replace(/<m:sPre[\s\S]*?>([\s\S]*?)<\/m:sPre>/g, (_, inner) => {
    const subMatch = inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
    const supMatch = inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
    const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const sub = subMatch ? getText(subMatch[1]) : '';
    const sup = supMatch ? getText(supMatch[1]) : '';
    const e = eMatch ? getText(eMatch[1]) : '';
    const supPart = sup ? '^{' + sup + '}' : '';
    const subPart = sub ? '_{' + sub + '}' : '';
    return '{' + supPart + subPart + e + '}';
  });

  // 2. sSubSup: vừa có chỉ số dưới vừa có mũ
  xml = xml.replace(/<m:sSubSup[\s\S]*?>([\s\S]*?)<\/m:sSubSup>/g, (_, inner) => {
    const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const subMatch = inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
    const supMatch = inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
    const e = eMatch ? getText(eMatch[1]) : '';
    const sub = subMatch ? getText(subMatch[1]) : '';
    const sup = supMatch ? getText(supMatch[1]) : '';
    return e + '_{' + sub + '}^{' + sup + '}';
  });

  // 3. sSub: chỉ số dưới (vd: H2O, CO2, Cl2)
  xml = xml.replace(/<m:sSub[\s\S]*?>([\s\S]*?)<\/m:sSub>/g, (_, inner) => {
    const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const subMatch = inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
    const e = eMatch ? getText(eMatch[1]) : '';
    const sub = subMatch ? getText(subMatch[1]) : '';
    return e + '_{' + sub + '}';
  });

  // 4. sSup: chỉ số trên / số mũ (vd: x^2, 2s^2, 2p^6)
  xml = xml.replace(/<m:sSup[\s\S]*?>([\s\S]*?)<\/m:sSup>/g, (_, inner) => {
    const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const supMatch = inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
    const e = eMatch ? getText(eMatch[1]) : '';
    const sup = supMatch ? getText(supMatch[1]) : '';
    return e + '^{' + sup + '}';
  });

  // 5. f: phân số
  xml = xml.replace(/<m:f[\s\S]*?>([\s\S]*?)<\/m:f>/g, (_, inner) => {
    const numMatch = inner.match(/<m:num>([\s\S]*?)<\/m:num>/);
    const denMatch = inner.match(/<m:den>([\s\S]*?)<\/m:den>/);
    const num = numMatch ? getText(numMatch[1]) : '';
    const den = denMatch ? getText(denMatch[1]) : '';
    return '\\frac{' + num + '}{' + den + '}';
  });

  // 6. rad: căn thức
  xml = xml.replace(/<m:rad[\s\S]*?>([\s\S]*?)<\/m:rad>/g, (_, inner) => {
    const degMatch = inner.match(/<m:deg>([\s\S]*?)<\/m:deg>/);
    const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
    const deg = degMatch ? getText(degMatch[1]) : '';
    const e = eMatch ? getText(eMatch[1]) : '';
    return deg ? '\\sqrt[' + deg + ']{' + e + '}' : '\\sqrt{' + e + '}';
  });

  // 7. Lấy các text còn lại và bỏ các thẻ xml
  xml = xml.replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g, '$1');
  xml = xml.replace(/<[^>]+>/g, '');
  return xml.trim();
}

/**
 * Trích xuất văn bản từ file Word .docx bảo toàn 100% công thức Toán / Hóa học (OMML Math)
 */
export async function extractDocxTextWithMath(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      const res = await mammoth.extractRawText({ arrayBuffer });
      return res.value;
    }

    let xml = await docXmlFile.async('string');

    // Bảo tồn tab ngăn cách các phương án trắc nghiệm A, B, C, D trên cùng dòng
    xml = xml.replace(/<w:tab[^>]*\/>/g, '<w:t xml:space="preserve">&#9;</w:t>');

    // Chuyển đổi các khối công thức Office MathML thành KaTeX $...$
    const convertedXml = xml.replace(/<m:oMath[\s\S]*?<\/m:oMath>/g, (m) => {
      const latex = convertOMathToLatex(m);
      if (!latex) return '';
      return '<w:r><w:t xml:space="preserve">$' + latex + '$</w:t></w:r>';
    });

    // Bóc tách từng đoạn văn bản <w:p>
    const pMatches = convertedXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
    const textLines = pMatches
      .map((p) => {
        const tMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return tMatches.map((t) => t.replace(/<\/?w:t[^>]*>/g, '')).join('');
      })
      .filter((l) => l.trim().length > 0);

    const extracted = textLines.join('\n');
    return extracted.trim() ? extracted : (await mammoth.extractRawText({ arrayBuffer })).value;
  } catch (err) {
    console.warn('Lỗi phân tích OMML Math từ docx, chuyển về mammoth:', err);
    const res = await mammoth.extractRawText({ arrayBuffer });
    return res.value;
  }
}

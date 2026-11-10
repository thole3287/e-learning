import React, { useState } from 'react';
import katex from 'katex';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface MathToolbarProps {
  onInsert: (snippet: string) => void;
  activeTargetName?: string;
}

interface SymbolItem {
  label: string;
  latex: string;
  renderLatex?: string;
  tooltip: string;
}

const QUICK_SYMBOLS: SymbolItem[] = [
  { label: 'Phân số', latex: '\\frac{a}{b}', tooltip: 'Phân số a/b' },
  { label: 'Căn bậc 2', latex: '\\sqrt{x}', tooltip: 'Căn bậc hai của x' },
  { label: 'Số mũ', latex: '^{2}', renderLatex: 'x^{2}', tooltip: 'Số mũ / Lũy thừa' },
  { label: 'Chỉ số dưới', latex: '_{1}', renderLatex: 'x_{1}', tooltip: 'Chỉ số dưới (vd: x1, H2O)' },
  { label: 'Cộng trừ', latex: '\\pm', tooltip: 'Dấu cộng trừ' },
  { label: 'Nhân', latex: '\\times', tooltip: 'Dấu nhân' },
  { label: 'Chia', latex: '\\div', tooltip: 'Dấu chia' },
  { label: 'Nhỏ hơn hoặc bằng', latex: '\\le', tooltip: 'Nhỏ hơn hoặc bằng' },
  { label: 'Lớn hơn hoặc bằng', latex: '\\ge', tooltip: 'Lớn hơn hoặc bằng' },
  { label: 'Khác', latex: '\\neq', tooltip: 'Dấu khác' },
  { label: 'Pi', latex: '\\pi', tooltip: 'Số Pi' },
  { label: 'Alpha', latex: '\\alpha', tooltip: 'Ký tự Alpha' },
  { label: 'Beta', latex: '\\beta', tooltip: 'Ký tự Beta' },
  { label: 'Delta', latex: '\\Delta', tooltip: 'Ký hiệu Delta' },
  { label: 'Vô cùng', latex: '\\infty', tooltip: 'Vô cực' },
  { label: 'Độ C', latex: '^{\\circ}\\text{C}', tooltip: 'Độ C' },
  { label: 'Đồng vị H1', latex: '{}^{1}_{1}\\text{H}', tooltip: 'Đồng vị hạt nhân (số khối A trên, số hiệu Z dưới)' },
  { label: 'Nước H2O', latex: '\\text{H}_2\\text{O}', tooltip: 'Công thức hóa học phân tử' },
  { label: 'Mũi tên', latex: '\\rightarrow', tooltip: 'Mũi tên suy ra / phản ứng' },
  { label: 'Tích phân', latex: '\\int_{a}^{b}', tooltip: 'Tích phân từ a đến b' },
  { label: 'Tổng sigma', latex: '\\sum_{i=1}^{n}', tooltip: 'Tổng sigma từ i=1 đến n' },
  { label: 'Giới hạn', latex: '\\lim_{x \\to 0}', tooltip: 'Giới hạn lim khi x tiến về 0' },
  { label: 'Vecto', latex: '\\vec{u}', tooltip: 'Vectơ u' },
  { label: 'Góc', latex: '\\widehat{A}', tooltip: 'Góc A' },
];

const CATEGORIES: {
  id: string;
  name: string;
  symbols: SymbolItem[];
}[] = [
  {
    id: 'structures',
    name: 'Cấu trúc công thức',
    symbols: [
      { label: 'Phân số a/b', latex: '\\frac{a}{b}', tooltip: 'Phân số' },
      { label: 'Căn bậc 2', latex: '\\sqrt{x}', tooltip: 'Căn bậc hai' },
      { label: 'Căn bậc n', latex: '\\sqrt[n]{x}', tooltip: 'Căn bậc n' },
      { label: 'Số mũ x²', latex: '^{2}', renderLatex: 'x^{2}', tooltip: 'Bình phương' },
      { label: 'Số mũ tổng quát', latex: '^{n}', renderLatex: 'x^{n}', tooltip: 'Số mũ n' },
      { label: 'Chỉ số dưới x₁', latex: '_{1}', renderLatex: 'x_{1}', tooltip: 'Chỉ số dưới 1' },
      { label: 'Chỉ số dưới i', latex: '_{i}', renderLatex: 'x_{i}', tooltip: 'Chỉ số dưới i' },
      { label: 'Cả mũ và chỉ số', latex: '_{1}^{2}', renderLatex: 'x_{1}^{2}', tooltip: 'Vừa mũ vừa chỉ số dưới' },
      { label: 'Ngoặc tròn ( )', latex: '\\left( \\frac{a}{b} \\right)', tooltip: 'Ngoặc tròn tự co giãn' },
      { label: 'Ngoặc vuông [ ]', latex: '\\left[ \\frac{a}{b} \\right]', tooltip: 'Ngoặc vuông tự co giãn' },
      { label: 'Giá trị tuyệt đối', latex: '|x|', tooltip: 'Giá trị tuyệt đối / độ dài' },
      { label: 'Vectơ u', latex: '\\vec{u}', tooltip: 'Vectơ' },
      { label: 'Đoạn thẳng AB', latex: '\\overline{AB}', tooltip: 'Độ dài đại số đoạn AB' },
      { label: 'Góc ABC', latex: '\\widehat{ABC}', tooltip: 'Ký hiệu góc ABC' },
      {
        label: 'Hệ phương trình',
        latex: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}',
        tooltip: 'Hệ phương trình 2 ẩn',
      },
    ],
  },
  {
    id: 'operators',
    name: 'Phép tính & So sánh',
    symbols: [
      { label: '±', latex: '\\pm', tooltip: 'Cộng trừ' },
      { label: '∓', latex: '\\mp', tooltip: 'Trừ cộng' },
      { label: '×', latex: '\\times', tooltip: 'Phép nhân' },
      { label: '÷', latex: '\\div', tooltip: 'Phép chia' },
      { label: '·', latex: '\\cdot', tooltip: 'Dấu chấm nhân' },
      { label: '≤', latex: '\\le', tooltip: 'Nhỏ hơn hoặc bằng' },
      { label: '≥', latex: '\\ge', tooltip: 'Lớn hơn hoặc bằng' },
      { label: '≠', latex: '\\neq', tooltip: 'Khác' },
      { label: '≈', latex: '\\approx', tooltip: 'Xấp xỉ' },
      { label: '≡', latex: '\\equiv', tooltip: 'Đồng nhất / Đồng dư' },
      { label: '∝', latex: '\\propto', tooltip: 'Tỉ lệ thuận' },
      { label: '∞', latex: '\\infty', tooltip: 'Vô cùng' },
      { label: '°', latex: '^{\\circ}', renderLatex: '90^{\\circ}', tooltip: 'Độ' },
      { label: '%', latex: '\\%', tooltip: 'Phần trăm' },
    ],
  },
  {
    id: 'greek',
    name: 'Ký tự Hy Lạp',
    symbols: [
      { label: 'α', latex: '\\alpha', tooltip: 'Alpha' },
      { label: 'β', latex: '\\beta', tooltip: 'Beta' },
      { label: 'γ', latex: '\\gamma', tooltip: 'Gamma' },
      { label: 'δ', latex: '\\delta', tooltip: 'Delta thường' },
      { label: 'Δ', latex: '\\Delta', tooltip: 'Delta hoa' },
      { label: 'ε', latex: '\\epsilon', tooltip: 'Epsilon' },
      { label: 'θ', latex: '\\theta', tooltip: 'Theta' },
      { label: 'λ', latex: '\\lambda', tooltip: 'Lambda' },
      { label: 'μ', latex: '\\mu', tooltip: 'Micro / Mu' },
      { label: 'π', latex: '\\pi', tooltip: 'Pi' },
      { label: 'ρ', latex: '\\rho', tooltip: 'Rho' },
      { label: 'σ', latex: '\\sigma', tooltip: 'Sigma' },
      { label: 'ω', latex: '\\omega', tooltip: 'Omega thường' },
      { label: 'Ω', latex: '\\Omega', tooltip: 'Omega hoa' },
    ],
  },
  {
    id: 'sets',
    name: 'Tập hợp & Logic',
    symbols: [
      { label: 'Thuộc ∈', latex: '\\in', tooltip: 'Phần tử thuộc tập hợp' },
      { label: 'Không thuộc ∉', latex: '\\notin', tooltip: 'Không thuộc' },
      { label: 'Tập con ⊂', latex: '\\subset', tooltip: 'Tập con' },
      { label: 'Tập con ⊆', latex: '\\subseteq', tooltip: 'Tập con hoặc bằng' },
      { label: 'Hợp ∪', latex: '\\cup', tooltip: 'Phép hợp tập hợp' },
      { label: 'Giao ∩', latex: '\\cap', tooltip: 'Phép giao tập hợp' },
      { label: 'Rỗng ∅', latex: '\\emptyset', tooltip: 'Tập rỗng' },
      { label: 'Tập số thực ℝ', latex: '\\mathbb{R}', tooltip: 'Tập số thực R' },
      { label: 'Tập số tự nhiên ℕ', latex: '\\mathbb{N}', tooltip: 'Tập số tự nhiên N' },
      { label: 'Tập số nguyên ℤ', latex: '\\mathbb{Z}', tooltip: 'Tập số nguyên Z' },
      { label: 'Với mọi ∀', latex: '\\forall', tooltip: 'Với mọi' },
      { label: 'Tồn tại ∃', latex: '\\exists', tooltip: 'Tồn tại' },
      { label: 'Suy ra ⇒', latex: '\\Rightarrow', tooltip: 'Suy ra' },
      { label: 'Tương đương ⇔', latex: '\\Leftrightarrow', tooltip: 'Tương đương' },
    ],
  },
  {
    id: 'calculus',
    name: 'Giải tích & Lượng giác',
    symbols: [
      { label: 'Tích phân', latex: '\\int_{a}^{b}', tooltip: 'Tích phân xác định' },
      { label: 'Tích phân bất định', latex: '\\int', tooltip: 'Tích phân' },
      { label: 'Tổng sigma', latex: '\\sum_{i=1}^{n}', tooltip: 'Tổng sigma' },
      { label: 'Tích Pi hoa', latex: '\\prod_{i=1}^{n}', tooltip: 'Tích các phần tử' },
      { label: 'Giới hạn lim', latex: '\\lim_{x \\to x_0}', tooltip: 'Giới hạn hàm số' },
      { label: 'y\'', latex: 'y\'', tooltip: 'Đạo hàm cấp 1' },
      { label: 'y\'\'', latex: 'y\'\'', tooltip: 'Đạo hàm cấp 2' },
      { label: 'sin', latex: '\\sin(x)', tooltip: 'Hàm sin' },
      { label: 'cos', latex: '\\cos(x)', tooltip: 'Hàm cos' },
      { label: 'tan', latex: '\\tan(x)', tooltip: 'Hàm tan' },
      { label: 'cot', latex: '\\cot(x)', tooltip: 'Hàm cot' },
      { label: 'log_a', latex: '\\log_{a}(x)', tooltip: 'Logarit cơ số a' },
      { label: 'ln', latex: '\\ln(x)', tooltip: 'Logarit tự nhiên ln' },
    ],
  },
  {
    id: 'chemistry',
    name: 'Hóa học & Mũi tên',
    symbols: [
      { label: 'Mũi tên phản ứng', latex: '\\rightarrow', tooltip: 'Phản ứng 1 chiều' },
      { label: 'Thuận nghịch', latex: '\\rightleftharpoons', tooltip: 'Phản ứng thuận nghịch' },
      { label: 'Khí thoát ra ↑', latex: '\\uparrow', tooltip: 'Khí bay lên' },
      { label: 'Kết tủa ↓', latex: '\\downarrow', tooltip: 'Chất kết tủa lắng xuống' },
      { label: 'Nhiệt độ t°', latex: '\\xrightarrow{t^{\\circ}}', tooltip: 'Đun nóng' },
      { label: 'Xúc tác nhiệt độ', latex: '\\xrightarrow{\\text{xt, } t^{\\circ}}', tooltip: 'Có xúc tác và nhiệt độ' },
      { label: 'Độ C (°C)', latex: '^{\\circ}\\text{C}', tooltip: 'Đơn vị nhiệt độ độ C' },
      { label: 'pH', latex: '\\text{pH}', tooltip: 'Chỉ số pH' },
      { label: 'Đồng vị {}^{1}_{1}H', latex: '{}^{1}_{1}\\text{H}', tooltip: 'Đồng vị Hydrogen-1' },
      { label: 'Đồng vị {}^{2}_{1}H', latex: '{}^{2}_{1}\\text{H}', tooltip: 'Đồng vị Hydrogen-2 (Deuterium)' },
      { label: 'Đồng vị {}^{3}_{1}H', latex: '{}^{3}_{1}\\text{H}', tooltip: 'Đồng vị Hydrogen-3 (Tritium)' },
      { label: 'Đồng vị {}^{16}_{8}O', latex: '{}^{16}_{8}\\text{O}', tooltip: 'Đồng vị Oxygen-16' },
      { label: 'Đồng vị {}^{17}_{8}O', latex: '{}^{17}_{8}\\text{O}', tooltip: 'Đồng vị Oxygen-17' },
      { label: 'Đồng vị {}^{18}_{8}O', latex: '{}^{18}_{8}\\text{O}', tooltip: 'Đồng vị Oxygen-18' },
      { label: 'Đồng vị {}^{12}_{6}C', latex: '{}^{12}_{6}\\text{C}', tooltip: 'Đồng vị Carbon-12' },
      { label: 'Đồng vị {}^{13}_{6}C', latex: '{}^{13}_{6}\\text{C}', tooltip: 'Đồng vị Carbon-13' },
      { label: 'Đồng vị {}^{35}_{17}Cl', latex: '{}^{35}_{17}\\text{Cl}', tooltip: 'Đồng vị Chlorine-35' },
      { label: 'Đồng vị {}^{37}_{17}Cl', latex: '{}^{37}_{17}\\text{Cl}', tooltip: 'Đồng vị Chlorine-37' },
      { label: 'Đồng vị {}^{A}_{Z}X', latex: '{}^{A}_{Z}\\text{X}', tooltip: 'Ký hiệu đồng vị nguyên tử bất kỳ: số khối A trên, số hiệu Z dưới' },
      { label: 'Phân tử H2O', latex: '\\text{H}_2\\text{O}', tooltip: 'Nước H2O' },
      { label: 'Phân tử CO2', latex: '\\text{CO}_2', tooltip: 'Khí Carbonic CO2' },
      { label: 'Phân tử HCl', latex: '\\text{HCl}', tooltip: 'Axit Clohidric' },
      { label: 'Phân tử Cl2', latex: '\\text{Cl}_2', tooltip: 'Khí Clo Cl2' },
      { label: 'Axit H2SO4', latex: '\\text{H}_2\\text{SO}_4', tooltip: 'Axit Sunfuric' },
    ],
  },
];

export const MathToolbar: React.FC<MathToolbarProps> = ({ onInsert, activeTargetName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('structures');

  // Helper render KaTeX an toàn
  const renderKaTeXHtml = (latexCode: string) => {
    try {
      return katex.renderToString(latexCode, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return latexCode;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs mb-2 transition-all">
      {/* Header thanh công cụ kiểu Word */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-800">
            Chèn Ký Hiệu & Công Thức Toán (Chuẩn Word)
          </span>
          {activeTargetName && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
              Đang chèn vào: {activeTargetName}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-200/80 transition-all cursor-pointer"
        >
          {isExpanded ? (
            <>
              Thu gọn <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Xem tất cả ký hiệu (Gallery) <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Dãy nút bấm nhanh (Quick Bar) */}
      <div className="p-2 flex flex-wrap gap-1.5 items-center bg-white">
        {QUICK_SYMBOLS.map((item, idx) => {
          const html = renderKaTeXHtml(item.renderLatex || item.latex);
          return (
            <button
              key={idx}
              type="button"
              title={item.tooltip}
              onClick={() => onInsert(item.latex)}
              className="h-8 min-w-[34px] px-2 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 text-xs flex items-center justify-center transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
            >
              <span dangerouslySetInnerHTML={{ __html: html }} className="pointer-events-none select-none" />
            </button>
          );
        })}
      </div>

      {/* Gallery mở rộng với các Tab chuyên sâu */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-3 space-y-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Lưới ký hiệu trong tab đang chọn */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 max-h-56 overflow-y-auto p-1">
            {CATEGORIES.find((c) => c.id === activeTab)?.symbols.map((item, idx) => {
              const html = renderKaTeXHtml(item.renderLatex || item.latex);
              return (
                <button
                  key={idx}
                  type="button"
                  title={item.tooltip}
                  onClick={() => onInsert(item.latex)}
                  className="h-10 p-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 text-slate-800 text-xs flex flex-col items-center justify-center gap-0.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group"
                >
                  <span
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="pointer-events-none select-none text-sm group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[9px] text-slate-400 group-hover:text-indigo-600 truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 flex items-center justify-between">
            <span>💡 <strong>Mẹo:</strong> Nhấp vào bất kỳ ký hiệu nào để tự động chèn vào vị trí con trỏ trong ô văn bản đang chọn. Biểu thức sẽ hiển thị trực quan ngay lập tức bên dưới!</span>
          </div>
        </div>
      )}
    </div>
  );
};

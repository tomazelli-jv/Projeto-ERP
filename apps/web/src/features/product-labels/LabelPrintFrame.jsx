import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { labelCss, labelSheets } from './label-model.js';
import { ProductLabel } from './ProductLabel.jsx';

// Iframe same-origin isolado: print() nunca é chamado na janela do ERP. Somente o modelo
// de etiquetas é montado; nenhum dado é interpolado como HTML. Mantido até o usuário voltar.
export function LabelPrintFrame({ labels, onReady, onError }) {
  const frame = useRef(null);
  const [body, setBody] = useState(null);
  const started = useRef(false);
  useEffect(() => {
    if (!body || started.current) return;
    let cancelled = false;
    const print = async () => {
      try {
        await body.ownerDocument.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (cancelled) return;
        started.current = true;
        frame.current.contentWindow.focus();
        frame.current.contentWindow.print();
        onReady();
      } catch {
        onError('Não foi possível abrir a impressão do navegador. Tente novamente.');
      }
    };
    print();
    return () => {
      cancelled = true;
    };
  }, [body, onReady, onError]);
  return (
    <>
      <iframe
        ref={frame}
        title="Impressão de etiquetas"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'fixed', left: -10000, top: 0, width: '210mm', height: '297mm', border: 0 }}
        srcDoc="<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>Etiquetas de produtos</title></head><body></body></html>"
        onLoad={() => setBody(frame.current.contentDocument.body)}
      />
      {body &&
        createPortal(
          <>
            <style>{labelCss}</style>
            {labelSheets(labels).map((sheet, index) => (
              <section className="label-sheet" key={index}>
                {sheet.map(({ key, product }) => (
                  <ProductLabel key={key} product={product} />
                ))}
              </section>
            ))}
          </>,
          body
        )}
    </>
  );
}
LabelPrintFrame.propTypes = {
  labels: PropTypes.array.isRequired,
  onReady: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired
};

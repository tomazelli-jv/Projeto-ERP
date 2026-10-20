import PropTypes from 'prop-types';
import { formatMoney } from '../../components/business/money.js';

// Texto escapado pelo React. Sem barras fictícias: GTIN é reproduzido somente quando cadastrado.
export function ProductLabel({ product }) {
  const price = formatMoney(product.priceCents);
  return (
    <article className="product-label" aria-label={`Etiqueta de ${product.name}`}>
      <div className="product-label-name" title={product.name}>
        {product.name}
      </div>
      <div className={`product-label-price${price.length > 13 ? ' long-price' : ''}`}>{price}</div>
      {product.gtin && <div className="product-label-barcode">{product.gtin}</div>}
      <div className="product-label-code" title={product.code}>
        Cód. {product.code}
      </div>
    </article>
  );
}
ProductLabel.propTypes = { product: PropTypes.object.isRequired };

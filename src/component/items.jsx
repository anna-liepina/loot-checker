import React from 'react';
import PropTypes from 'prop-types';

const Items = ({ data, size }) =>
    <ul>
        {
            data.map(
                ({ name, items }, i) =>
                    <li key={i}>
                        <div>{name}</div>
                        {
                            items.map(({ label, item, amount: a = 1, quality: q = 1}, i) =>
                                <span key={i} className="item">
                                    <img
                                        className="item-picture"
                                        src={`https://render.albiononline.com/v1/item/${item || label}.png?&quality=${q}&size=${size}`}
                                        alt={item || label}
                                    />
                                    <span className="item-counter">{a}</span>
                                </span>
                            )
                        }
                    </li>
            )
        }
    </ul>;

Items.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string,
            item: PropTypes.string,
            amount: PropTypes.number,
            quality: PropTypes.number
        })
    ),
    size: PropTypes.number,
};

Items.defaultProps = {
    size: 64,
}
export default Items;

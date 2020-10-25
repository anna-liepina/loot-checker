import React from 'react';

const Items = ({ data }) =>
    <ul>
        {
            data.map(
                ({ name, items }, i) =>
                    <li key={i}>
                        <div>{name}</div>
                        {
                            items.map(({ label, item, amount }, i) =>
                                <span key={i} className="preview-item">
                                    <img
                                        className="preview-item-picture"
                                        src={`https://render.albiononline.com/v1/item/${item || label}.png?count=${amount}&quality=1`}
                                        alt={item || label}
                                    />
                            x {amount}
                                </span>
                            )
                        }
                    </li>
            )
        }
    </ul>;

export default Items;

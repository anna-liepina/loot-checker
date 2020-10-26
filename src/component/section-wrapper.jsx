import React, { PureComponent } from 'react';

export default class SectionWrapper extends PureComponent {
    constructor({ isExpanded }) {
        super();

        this.state = {
            isExpanded,
        };

        this.onToggle = this.onToggle.bind(this);
    }

    onToggle() {
        const { isExpanded } = this.state;

        this.setState({ isExpanded: !isExpanded });
    }

    render() {
        const { isExpanded } = this.state;
        const { label, children, disabled } = this.props;

        return <>
            <button onClick={this.onToggle} disabled={disabled || isExpanded}>{label}</button>
            {
                isExpanded &&
                <div className="section-content">
                    <button className="section-button-close-expanded" onClick={this.onToggle}>x</button>
                    {children}
                </div >}
        </>;
    }
}

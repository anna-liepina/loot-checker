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
        const { label, children } = this.props;

        return <div className="section-wrapper">
            {!isExpanded && <button onClick={this.onToggle}>{label}</button>}
            {isExpanded &&
                <div className="section-wrapper--content">
                    <button className="section-button-close-expanded" onClick={this.onToggle}>x</button>
                    {children}
                </div>}
        </div>;
    }
}

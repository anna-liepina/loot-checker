import React, { PureComponent } from 'react';

import papa from 'papaparse';
import TreeHandler from './tree-handler';
import SectionWrapper from './section-wrapper';
import Items from './items';
import { parseChestLog, buildRecord, onFilter, onExpand } from '../utils';

export default class Side extends PureComponent {
    constructor() {
        super();

        this.onPaste = this.onPaste.bind(this);
        this.handleFile = this.handleFile.bind(this);
        this.handleSection = this.handleSection.bind(this);
    }

    onPaste(e) {
        const { value: v } = e.target;
        const section = e.target.getAttribute('data-section-id');

        const _data = [...this.props.data];
        _data[section] = parseChestLog(v);

        this.props.onChange(this.props['data-side'], _data);
    }

    handleFile(e) {
        e.stopPropagation();
        const file = e.target.files[0];
        const section = e.target.getAttribute('data-section-id');

        const reader = new FileReader();
        reader.onloadend = () => {
            const { data } = papa.parse(reader.result);
            const content = [];

            for (const row of data) {
                try {
                    if ('' === row[0]) {
                        continue;
                    }

                    content.push(buildRecord(row));
                } catch (e) {
                }
            }

            const _data = [...this.props.data];
            _data[section] = content;

            this.props.onChange(this.props['data-side'], _data);
        }

        reader.readAsText(file);
    }

    handleSection() {
        const { data } = this.props;

        this.props.onChange(this.props['data-side'], [...data, null]);
    }

    render() {
        return <section className="side__section">
            <h2>{this.props.label} - {this.props['data-side']}</h2>
            <SectionWrapper label="search in tree" >
                <TreeHandler placeholder="type here to start search in tree" onFilter={onFilter} data={this.props.tree} onExpand={onExpand} />
            </SectionWrapper>
            <SectionWrapper label="review items">
                <Items data={this.props.cache} />
            </SectionWrapper>

            <button onClick={this.handleSection}>+</button>
            {
                this.props.data.map((v, i) =>
                    <div key={i} className="side__section">
                        <label className="side__section--label">
                            file:
                            <input
                                type="file"
                                accept=".csv"
                                data-section-id={i}
                                onChange={this.handleFile}
                            />
                        </label>
                        <label className="side__section--label">
                            logs:
                                <textarea
                                data-section-id={i}
                                onChange={this.onPaste}
                                rows={20}
                            />
                        </label>
                    </div>
                )
            }

        </section>;
    }
}

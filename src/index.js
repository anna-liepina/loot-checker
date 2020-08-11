import React from 'react';
import ReactDOM from 'react-dom';
import papa from 'papaparse';
import './index.scss';
import TreeHandler from './component/tree-handler';
import { filter } from './filtering/engine';

const onFilter = (data, pattern) => {
    pattern = (pattern || '').toLowerCase();

    for (const v of data) {
        v.isExpanded = filter(v, pattern);

        if (!pattern) {
            v.isExpanded = false;
            v.isVisible = true;
        }
    }
};

const onExpand = (data, path) => {
    let pos = 0;
    let cursor = data;
    const arr = path.split('-');

    while (pos < arr.length) {
        cursor = pos === arr.length - 1
            ? cursor[arr[pos]]
            : cursor[arr[pos]].nodes;

        pos++;
    }

    cursor.isExpanded = !cursor.nodes.some((v) => v.isVisible);
    cursor.nodes.forEach((v, i) => v.isVisible = cursor.isExpanded);
};

// import './docs/index.scss';
// import 'prismjs/themes/prism-twilight.css';

// import Documentation from './docs';

// ReactDOM.render(<Documentation />, document.getElementById('root'));

const extract = (v) => v.slice(1, v.length - 1);
const parseChestLog = (v) => {
    const lines = v.split(/\r?\n/);
    const data = [];

    for (const line of lines.slice(1)) {
        const chunks = line.split('\t');

        if ('"Data"' === chunks[0]) {
            continue;
        }

        try {
            if (parseInt(extract(chunks[5])) < 0) {
                continue;
            }

            // 0                        1           2                       3               4           5
            // "Date"	                "Player"	"Item"	                "Enchantment"	"Quality"	"Amount"
            // "07/29/2020 16:21:09"	"Pentheos"	"Master's Demon Armor"	"2"	            "3" 	    "-1"
            data.push({
                player: extract(chunks[1]),
                guild: null,
                alliance: null,

                item: null,
                label: extract(chunks[2]),
                amount: extract(chunks[5]),
                timestamp: extract(chunks[0]),
            });
        } catch (e) {
            debugger;
        }
    }

    return data;
}

//      0                      1        2            3          4                         5                                                          6    7    8
// (9) ["21/07/2020 23:51:43", "ARM0R", "Blue Army", "Snaxxor", "T7_HEAD_PLATE_KEEPER@1", "T7_HEAD_PLATE_KEEPER@1 - Grandmaster's Judicator Helmet", "1", "1", "YURI2X2"]
const buildRecord = (v, index) => ({
    player: v[3],
    guild: v[2],
    alliance: v[1],

    item: v[4],
    label: v[5].replace(`${v[4]} - `, ''),
    amount: v[7],
    timestamp: v[0],
});

class Side extends React.PureComponent {
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
                                    />
                            x {amount}
                                </span>
                            )
                        }
                    </li>
            )
        }
    </ul>;

class SectionWrapper extends React.PureComponent {
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
class App extends React.PureComponent {
    constructor({ }) {
        super();

        this.state = {
            alliances: '',
            players: '',
            items: '',
            left: [null],
            leftCache: [],
            leftPlayers: {},
            leftTree: [],
            right: [null],
            rightCache: [],
            rightTree: [],
            rightPlayers: {},
            tiers: ['t4', 't5', 't6', 't7', 't8', 'extra'].reduce((acc, v) => (acc[v] = true, acc), {}),
            diff: [],
        };

        this.onChange = this.onChange.bind(this);
        this.onChangePattern = this.onChangePattern.bind(this);
        this.onTierChange = this.onTierChange.bind(this);

        this.calculateDiff = this.calculateDiff.bind(this);
    }

    onChange(side, json) {
        const players = {};
        const tree = {};

        /**
        alliance: "ARM0R"
        amount: "1"
        guild: "Blue Army"
        item: "T7_HEAD_PLATE_KEEPER@1"
        label: "Grandmaster's Judicator Helmet"
        player: "Snaxxor"
        timestamp: "21/07/2020 23:51:43"
        */
        for (const row of json) {
            if (!row) {
                continue;
            }

            for (const v of row) {
                let { alliance: a, guild: g, player: p, label, amount } = v;
                if (/^(Beginner|Novice|Journeyman)/.test(label)) {
                    continue;
                }

                if (!a) {
                    a = 'n/a';
                }
                if (!g) {
                    g = 'n/a';
                }

                if (!tree[a]) {
                    tree[a] = {};
                }

                if (!tree[a][g]) {
                    tree[a][g] = {};
                }

                if (!players[p]) {
                    players[p] = {};
                }

                if (!players[p][label]) {
                    players[p][label] = 0;
                }

                tree[a][g][p] = players[p];
                players[p][label] += parseInt(amount, 10);
            }
        }

        const c = [];
        for (const name in players) {
            const items = [];

            for (const item in players[name]) {
                items.push({
                    item,
                    amount: players[name][item],
                });
            }

            c.push({ name, items });
        }

        const t = [];
        for (const a in tree) {
            const guilds = [];
            for (const g in tree[a]) {
                const players = [];

                for (const p in tree[a][g]) {
                    const items = [];
                    for (const item in tree[a][g][p]) {

                        const amount = tree[a][g][p][item];
                        items.push({
                            text: `${item} x ${amount}`,
                        });
                    }

                    const player = {
                        text: p,
                        nodes: items,
                    };
                    players.push(player);
                }

                guilds.push({
                    text: g,
                    nodes: players,
                });
            }

            const alliance = {
                text: a,
                nodes: guilds,
            };

            t.push(alliance);
        }

        this.setState({ [side]: json, [`${side}Cache`]: c, [`${side}Tree`]: t, [`${side}Players`]: players }, this.calculateDiff);
    }

    onChangePattern(e) {
        const field = e.target.getAttribute('data-type');

        this.setState({ [field]: e.target.value }, this.calculateDiff);
    }

    onTierChange(e) {
        const tier = e.target.getAttribute('data-tier');

        const { tiers } = this.state;

        this.setState({ tiers: { ...tiers, [tier]: e.target.checked } }, this.calculateDiff);
    }

    calculateDiff() {
        const { leftPlayers: loot, rightPlayers: deposit, players } = this.state;
        const { tiers } = this.state;

        const patterns = {
            t4: 'Adept',
            t5: 'Expert',
            t6: 'Master',
            t7: 'Grandmaster',
            t8: 'Elder',
        };


        const keys = Object.keys(patterns);
        const extra = keys.reduce((acc, v) => (acc.push(patterns[v]), acc), []);
        const regex = keys.reduce((acc, v) => {
            if (!tiers[v]) {
                return acc;
            }
            acc.push(patterns[v]);

            return acc;
        }, []);

        const criteria = new RegExp(regex.length ? `^(${regex.join('|')})` : `^(?!(${extra.join('|')})).*`);
        const extraCriteria = new RegExp(`^(?!(${extra.join('|')})).*`);
        const playerCriteria = players.toLocaleLowerCase().split(',');
        const diff = [];
        console.log({players, playerCriteria});
        for (const p in loot) {
            if (playerCriteria.length && !playerCriteria.some((v) => p.toLowerCase().indexOf(v) !== -1)) {
                continue;
            }

            const player = loot[p];
            const _player = deposit[p]
            const items = [];

            for (const item in player) {
                if (!criteria.test(item) && (!tiers.extra || (tiers.extra && !extraCriteria.test(item)))) {
                    continue;
                }

                let deposited = _player && _player[item] || 0

                const amount = player[item] - deposited;

                items.push({
                    item,
                    amount,
                });
            }

            diff.push({
                name: p,
                items,
            });
        }

        this.setState({ diff });
    }

    render() {
        // debugg   er;
        const { tiers } = this.state;
        return <>
            <div className="section">
                <h2 className="section-title">search in diff</h2>
                {/* <input disabled className="pattern-input" onChange={this.onChangePattern} data-type="alliance" value={this.state.alliances} placeholder="comma separated alliances" /> */}
                <input className="pattern-input" onChange={this.onChangePattern} data-type="players" value={this.state.pattern} placeholder="comma separated players" />
                {/* <input disabled className="pattern-input" onChange={this.onChangePattern} data-type="item" value={this.state.pattern} placeholder="comma separated items" /> */}

                <div>
                    <h3>tiers</h3>
                    {
                        Object.keys(tiers).map(
                            (v, i) => <label key={i}>
                                {v}
                                <input onChange={this.onTierChange} data-tier={v} type="checkbox" checked={tiers[v]} />
                            </label>
                        )
                    }
                </div>
            </div>
            <div className="section">
                <div>
                    <h3>diff [what is missing in deposit]</h3>
                    <Items data={this.state.diff} />
                </div>
            </div>
            <Side
                data-side="left"
                label={'looted'}
                data={this.state.left}
                cache={this.state.leftCache}
                tree={this.state.leftTree}
                onChange={this.onChange}
            />
            <Side
                data-side="right"
                label={'deposit'}
                data={this.state.right}
                cache={this.state.rightCache}
                tree={this.state.rightTree}
                onChange={this.onChange}
            />
        </>
    }

}



ReactDOM.render(<App />, document.getElementById('root'));

/**

"Date"	"Player"	"Item"	"Enchantment"	"Quality"	"Amount"
"07/29/2020 16:21:09"	"Pentheos"	"Master's Demon Armor"	"2"	"3"	"-1"
"07/29/2020 16:21:08"	"Pentheos"	"Master's Hellion Jacket"	"2"	"3"	"-1"
"07/29/2020 16:21:08"	"Pentheos"	"Master's Hellion Jacket"	"2"	"4"	"-1"
"07/29/2020 16:21:08"	"Pentheos"	"Master's Cleric Robe"	"1"	"1"	"-1"
"07/29/2020 16:21:08"	"Pentheos"	"Master's Cleric Robe"	"1"	"2"	"-2"
"07/29/2020 16:21:07"	"H7094"	"Master's Demon Armor"	"2"	"3"	"1"
"07/29/2020 16:21:07"	"H7094"	"Master's Hellion Jacket"	"2"	"3"	"1"
"07/29/2020 16:21:07"	"H7094"	"Master's Hellion Jacket"	"2"	"4"	"1"
"07/29/2020 16:21:06"	"H7094"	"Master's Cleric Robe"	"1"	"1"	"1"
"07/29/2020 16:21:06"	"H7094"	"Master's Cleric Robe"	"1"	"2"	"2"
"07/29/2020 16:21:03"	"Pentheos"	"Expert's Hellion Jacket"	"2"	"1"	"-1"
"07/29/2020 16:21:03"	"Pentheos"	"Expert's Royal Jacket"	"2"	"2"	"-1"
"07/29/2020 16:21:03"	"Pentheos"	"Elder's Soldier Armor"	"1"	"4"	"-1"
"07/29/2020 16:21:02"	"Pentheos"	"Master's Assassin Jacket"	"2"	"4"	"-1"
"07/29/2020 16:21:02"	"H7094"	"Expert's Royal Jacket"	"2"	"2"	"1"
"07/29/2020 16:21:02"	"Pentheos"	"Expert's Hellion Jacket"	"2"	"3"	"-2"
"07/29/2020 16:21:02"	"H7094"	"Expert's Hellion Jacket"	"2"	"1"	"1"
"07/29/2020 16:21:02"	"Pentheos"	"Master's Soldier Armor"	"1"	"3"	"-2"
"07/29/2020 16:21:02"	"H7094"	"Expert's Hellion Jacket"	"2"	"3"	"2"
"07/29/2020 16:21:02"	"Pentheos"	"Expert's Judicator Armor"	"2"	"2"	"-1"
"07/29/2020 16:21:01"	"H7094"	"Master's Assassin Jacket"	"2"	"4"	"1"
"07/29/2020 16:21:01"	"Pentheos"	"Master's Soldier Armor"	"1"	"2"	"-1"
"07/29/2020 16:21:01"	"H7094"	"Elder's Soldier Armor"	"1"	"4"	"1"
"07/29/2020 16:21:01"	"Pentheos"	"Master's Judicator Armor"	"1"	"3"	"-1"
"07/29/2020 16:21:01"	"H7094"	"Master's Soldier Armor"	"1"	"3"	"2"
"07/29/2020 16:21:01"	"Pentheos"	"Grandmaster's Soldier Armor"	"0"	"2"	"-2"
"07/29/2020 16:21:01"	"H7094"	"Master's Soldier Armor"	"1"	"2"	"1"
"07/29/2020 16:21:00"	"H7094"	"Expert's Judicator Armor"	"2"	"2"	"1"
"07/29/2020 16:21:00"	"Pentheos"	"Grandmaster's Soldier Armor"	"1"	"4"	"-1"
"07/29/2020 16:21:00"	"H7094"	"Master's Judicator Armor"	"1"	"3"	"1"
"07/29/2020 16:21:00"	"Pentheos"	"Grandmaster's Soldier Armor"	"0"	"1"	"-1"
"07/29/2020 16:21:00"	"H7094"	"Grandmaster's Soldier Armor"	"0"	"2"	"2"
"07/29/2020 16:20:59"	"Pentheos"	"Elder's Knight Armor"	"0"	"3"	"-1"
"07/29/2020 16:20:59"	"H7094"	"Grandmaster's Soldier Armor"	"1"	"4"	"1"
"07/29/2020 16:20:59"	"H7094"	"Grandmaster's Soldier Armor"	"0"	"1"	"1"
"07/29/2020 16:20:59"	"Pentheos"	"Expert's Judicator Armor"	"3"	"3"	"-1"
"07/29/2020 16:20:58"	"H7094"	"Elder's Knight Armor"	"0"	"3"	"1"
"07/29/2020 16:20:58"	"Pentheos"	"Elder's Guardian Armor"	"1"	"2"	"-1"
"07/29/2020 16:20:58"	"H7094"	"Expert's Judicator Armor"	"3"	"3"	"1"
"07/29/2020 16:20:58"	"Pentheos"	"Master's Knight Armor"	"1"	"3"	"-1"
"07/29/2020 16:20:58"	"H7094"	"Elder's Guardian Armor"	"1"	"2"	"1"
"07/29/2020 16:20:57"	"Pentheos"	"Elder's Guardian Armor"	"0"	"2"	"-5"
"07/29/2020 16:20:57"	"H7094"	"Master's Knight Armor"	"1"	"3"	"1"
"07/29/2020 16:20:57"	"Pentheos"	"Grandmaster's Scholar Sandals"	"0"	"2"	"-2"
"07/29/2020 16:20:57"	"Pentheos"	"Elder's Guardian Armor"	"0"	"3"	"-1"
"07/29/2020 16:20:57"	"H7094"	"Elder's Guardian Armor"	"0"	"2"	"5"
"07/29/2020 16:20:56"	"Pentheos"	"Grandmaster's Guardian Armor"	"1"	"2"	"-1"
"07/29/2020 16:20:56"	"H7094"	"Elder's Guardian Armor"	"0"	"3"	"1"
"07/29/2020 16:20:55"	"Pentheos"	"Elder's Guardian Armor"	"1"	"4"	"-1"
"07/29/2020 16:20:55"	"Pentheos"	"Grandmaster's Guardian Armor"	"0"	"2"	"-1"
"07/29/2020 16:20:55"	"Pentheos"	"Master's Scholar Sandals"	"1"	"1"	"-1"
"07/29/2020 16:20:55"	"H7094"	"Grandmaster's Guardian Armor"	"1"	"2"	"1"
"07/29/2020 16:20:55"	"Pentheos"	"Elder's Scholar Sandals"	"1"	"2"	"-1"
"07/29/2020 16:20:55"	"Pentheos"	"Elder's Scholar Sandals"	"0"	"3"	"-3"
"07/29/2020 16:20:54"	"Pentheos"	"Expert's Royal Sandals"	"3"	"3"	"-1"
"07/29/2020 16:20:54"	"Pentheos"	"Master's Royal Sandals"	"2"	"3"	"-1"
"07/29/2020 16:20:54"	"Pentheos"	"Elder's Scholar Sandals"	"2"	"2"	"-1"
"07/29/2020 16:20:53"	"Pentheos"	"Grandmaster's Scholar Sandals"	"1"	"3"	"-5"
"07/29/2020 16:20:53"	"H7094"	"Elder's Guardian Armor"	"1"	"4"	"1"
"07/29/2020 16:20:53"	"Pentheos"	"Grandmaster's Scholar Sandals"	"0"	"3"	"-1"
"07/29/2020 16:20:53"	"H7094"	"Grandmaster's Guardian Armor"	"0"	"2"	"1"
"07/29/2020 16:20:53"	"Pentheos"	"Adept's Royal Sandals"	"3"	"3"	"-2"
"07/29/2020 16:20:53"	"H7094"	"Master's Royal Sandals"	"2"	"3"	"1"
"07/29/2020 16:20:52"	"Pentheos"	"Expert's Royal Sandals"	"1"	"3"	"-1"
"07/29/2020 16:20:52"	"H7094"	"Expert's Royal Sandals"	"3"	"3"	"1"
"07/29/2020 16:20:52"	"Pentheos"	"Grandmaster's Scholar Sandals"	"1"	"4"	"-2"
"07/29/2020 16:20:52"	"H7094"	"Elder's Scholar Sandals"	"1"	"2"	"1"
"07/29/2020 16:20:52"	"Pentheos"	"Elder's Scholar Sandals"	"1"	"3"	"-1"
"07/29/2020 16:20:52"	"H7094"	"Elder's Scholar Sandals"	"0"	"3"	"3"
"07/29/2020 16:20:52"	"Pentheos"	"Master's Scholar Sandals"	"2"	"2"	"-1"
"07/29/2020 16:20:51"	"H7094"	"Adept's Royal Sandals"	"3"	"3"	"2"
"07/29/2020 16:20:51"	"H7094"	"Grandmaster's Scholar Sandals"	"1"	"4"	"2"
"07/29/2020 16:20:51"	"Pentheos"	"Expert's Scholar Sandals"	"2"	"3"	"-1"
"07/29/2020 16:20:51"	"Pentheos"	"Elder's Scholar Sandals"	"0"	"2"	"-4"
"07/29/2020 16:20:51"	"H7094"	"Elder's Scholar Sandals"	"1"	"3"	"1"
"07/29/2020 16:20:51"	"Pentheos"	"Adept's Royal Sandals"	"3"	"2"	"-1"
"07/29/2020 16:20:50"	"H7094"	"Expert's Royal Sandals"	"1"	"3"	"1"
"07/29/2020 16:20:50"	"Pentheos"	"Elder's Mage Sandals"	"1"	"3"	"-1"
"07/29/2020 16:20:50"	"H7094"	"Elder's Scholar Sandals"	"2"	"2"	"1"
"07/29/2020 16:20:50"	"Pentheos"	"Elder's Mage Sandals"	"0"	"4"	"-1"
"07/29/2020 16:20:50"	"H7094"	"Adept's Royal Sandals"	"3"	"2"	"1"
"07/29/2020 16:20:50"	"Pentheos"	"Master's Scholar Sandals"	"1"	"2"	"-1"
"07/29/2020 16:20:49"	"H7094"	"Elder's Scholar Sandals"	"0"	"2"	"4"
"07/29/2020 16:20:49"	"Pentheos"	"Master's Scholar Sandals"	"1"	"4"	"-1"
"07/29/2020 16:20:49"	"H7094"	"Grandmaster's Scholar Sandals"	"0"	"2"	"2"
"07/29/2020 16:20:49"	"Pentheos"	"Elder's Mage Sandals"	"0"	"3"	"-2"
"07/29/2020 16:20:49"	"H7094"	"Grandmaster's Scholar Sandals"	"0"	"3"	"1"
"07/29/2020 16:20:48"	"H7094"	"Grandmaster's Scholar Sandals"	"1"	"3"	"5"
"07/29/2020 16:20:48"	"H7094"	"Master's Scholar Sandals"	"1"	"1"	"1"
"07/29/2020 16:20:48"	"H7094"	"Master's Scholar Sandals"	"2"	"2"	"1"
"07/29/2020 16:20:47"	"H7094"	"Expert's Scholar Sandals"	"2"	"3"	"1"
"07/29/2020 16:20:47"	"H7094"	"Elder's Mage Sandals"	"1"	"3"	"1"
"07/29/2020 16:20:47"	"H7094"	"Elder's Mage Sandals"	"0"	"4"	"1"
"07/29/2020 16:20:46"	"H7094"	"Master's Scholar Sandals"	"1"	"2"	"1"
"07/29/2020 16:20:46"	"H7094"	"Master's Scholar Sandals"	"1"	"4"	"1"
"07/29/2020 16:20:46"	"H7094"	"Elder's Mage Sandals"	"0"	"3"	"2"
"07/29/2020 16:19:02"	"rawdogg"	"Master's Stalker Hood"	"2"	"4"	"-1"
"07/29/2020 16:19:02"	"rawdogg"	"Expert's Judicator Helmet"	"3"	"2"	"-1"
"07/29/2020 16:19:02"	"rawdogg"	"Grandmaster's Stalker Hood"	"1"	"3"	"-2"
"07/29/2020 16:19:02"	"rawdogg"	"Expert's Royal Hood"	"2"	"3"	"-1"

"Date"	"Player"	"Item"	"Enchantment"	"Quality"	"Amount"
"08/01/2020 15:59:00"	"H7094"	"Master's Hellion Jacket"	"1"	"2"	"1"
"08/01/2020 15:59:00"	"H7094"	"Master's Cleric Robe"	"2"	"2"	"2"
"08/01/2020 15:58:59"	"H7094"	"Master's Cleric Robe"	"1"	"3"	"1"
"08/01/2020 15:58:59"	"H7094"	"Master's Hellion Jacket"	"2"	"1"	"1"
"08/01/2020 15:58:58"	"H7094"	"Grandmaster's Specter Jacket"	"0"	"2"	"1"
"08/01/2020 15:58:58"	"H7094"	"Grandmaster's Demon Armor"	"1"	"3"	"1"
"08/01/2020 15:58:57"	"H7094"	"Adept's Hellion Jacket"	"3"	"2"	"1"
"08/01/2020 15:58:57"	"H7094"	"Master's Assassin Jacket"	"1"	"2"	"1"
"08/01/2020 15:58:56"	"H7094"	"Expert's Hellion Jacket"	"2"	"2"	"4"
"08/01/2020 15:58:55"	"H7094"	"Grandmaster's Assassin Jacket"	"1"	"3"	"1"
"08/01/2020 15:58:55"	"H7094"	"Master's Royal Jacket"	"1"	"2"	"1"
"08/01/2020 15:58:55"	"H7094"	"Master's Demon Armor"	"2"	"3"	"1"
"08/01/2020 15:58:55"	"H7094"	"Master's Demon Armor"	"0"	"1"	"1"
"08/01/2020 15:58:54"	"H7094"	"Master's Demon Armor"	"1"	"2"	"1"
"08/01/2020 15:58:54"	"H7094"	"Adept's Judicator Armor"	"2"	"3"	"1"
"08/01/2020 15:58:54"	"H7094"	"Master's Demon Armor"	"1"	"3"	"1"
"08/01/2020 15:58:54"	"H7094"	"Expert's Demon Armor"	"2"	"2"	"1"
"08/01/2020 15:58:53"	"H7094"	"Expert's Judicator Armor"	"2"	"2"	"2"
"08/01/2020 15:58:53"	"H7094"	"Elder's Soldier Armor"	"0"	"2"	"5"
"08/01/2020 15:58:53"	"H7094"	"Elder's Soldier Armor"	"0"	"3"	"1"
"08/01/2020 15:58:53"	"H7094"	"Adept's Judicator Armor"	"2"	"2"	"1"
"08/01/2020 15:58:52"	"H7094"	"Grandmaster's Soldier Armor"	"1"	"3"	"1"
"08/01/2020 15:57:13"	"H7094"	"Grandmaster's Soldier Armor"	"1"	"1"	"1"
"08/01/2020 15:57:11"	"H7094"	"Adept's Judicator Armor"	"3"	"3"	"1"
"08/01/2020 15:56:07"	"Cepas"	"Grandmaster's Mercenary Hood"	"0"	"2"	"-1"
"08/01/2020 15:56:07"	"Cepas"	"Grandmaster's Mercenary Hood"	"1"	"3"	"-3"
"08/01/2020 15:56:06"	"Cepas"	"Elder's Mercenary Hood"	"1"	"3"	"-1"
"08/01/2020 15:56:06"	"H7094"	"Grandmaster's Mercenary Hood"	"0"	"2"	"1"
"08/01/2020 15:56:06"	"Cepas"	"Grandmaster's Mercenary Hood"	"1"	"2"	"-1"
"08/01/2020 15:56:06"	"H7094"	"Grandmaster's Mercenary Hood"	"1"	"3"	"3"
"08/01/2020 15:56:06"	"Cepas"	"Elder's Mercenary Hood"	"1"	"1"	"-1"
"08/01/2020 15:56:06"	"H7094"	"Elder's Mercenary Hood"	"1"	"3"	"1"
"08/01/2020 15:56:06"	"Cepas"	"Master's Mercenary Hood"	"2"	"3"	"-1"
"08/01/2020 15:56:05"	"H7094"	"Grandmaster's Mercenary Hood"	"1"	"2"	"1"
"08/01/2020 15:56:05"	"Cepas"	"Elder's Mercenary Hood"	"0"	"2"	"-1"
"08/01/2020 15:56:05"	"H7094"	"Elder's Mercenary Hood"	"1"	"1"	"1"
"08/01/2020 15:56:05"	"H7094"	"Elder's Mercenary Hood"	"0"	"2"	"1"
"08/01/2020 15:56:04"	"H7094"	"Master's Mercenary Hood"	"2"	"3"	"1"
"08/01/2020 15:56:02"	"Cepas"	"Elder's Soldier Helmet"	"0"	"3"	"-1"
"08/01/2020 15:56:02"	"Cepas"	"Adept's Specter Hood"	"3"	"2"	"-1"
"08/01/2020 15:56:02"	"Cepas"	"Grandmaster's Assassin Hood"	"1"	"2"	"-1"
"08/01/2020 15:56:01"	"Cepas"	"Master's Assassin Hood"	"2"	"2"	"-1"
"08/01/2020 15:56:01"	"Cepas"	"Adept's Judicator Helmet"	"3"	"2"	"-1"
"08/01/2020 15:56:01"	"H7094"	"Master's Assassin Hood"	"2"	"2"	"1"
"08/01/2020 15:56:01"	"Cepas"	"Expert's Judicator Helmet"	"2"	"2"	"-1"
"08/01/2020 15:56:00"	"H7094"	"Adept's Judicator Helmet"	"3"	"2"	"1"
"08/01/2020 15:56:00"	"Cepas"	"Expert's Judicator Helmet"	"2"	"1"	"-1"
"08/01/2020 15:56:00"	"H7094"	"Expert's Judicator Helmet"	"2"	"1"	"1"
"08/01/2020 15:56:00"	"Cepas"	"Elder's Soldier Helmet"	"0"	"4"	"-2"
"08/01/2020 15:56:00"	"Cepas"	"Expert's Judicator Helmet"	"2"	"3"	"-3"
"08/01/2020 15:56:00"	"H7094"	"Expert's Judicator Helmet"	"2"	"2"	"1"
"08/01/2020 15:55:59"	"H7094"	"Elder's Soldier Helmet"	"0"	"4"	"2"
"08/01/2020 15:55:59"	"Cepas"	"Elder's Assassin Hood"	"0"	"3"	"-1"
"08/01/2020 15:55:59"	"H7094"	"Elder's Soldier Helmet"	"0"	"3"	"1"
"08/01/2020 15:55:59"	"H7094"	"Expert's Judicator Helmet"	"2"	"3"	"3"
"08/01/2020 15:55:59"	"Cepas"	"Grandmaster's Assassin Hood"	"0"	"3"	"-1"
"08/01/2020 15:55:59"	"H7094"	"Adept's Specter Hood"	"3"	"2"	"1"
"08/01/2020 15:55:58"	"Cepas"	"Grandmaster's Assassin Hood"	"1"	"3"	"-1"
"08/01/2020 15:55:58"	"H7094"	"Grandmaster's Assassin Hood"	"1"	"2"	"1"
"08/01/2020 15:55:58"	"H7094"	"Grandmaster's Assassin Hood"	"0"	"3"	"1"
"08/01/2020 15:55:58"	"Cepas"	"Master's Specter Hood"	"1"	"2"	"-1"
"08/01/2020 15:55:58"	"H7094"	"Elder's Assassin Hood"	"0"	"3"	"1"
"08/01/2020 15:55:58"	"Cepas"	"Elder's Assassin Hood"	"0"	"2"	"-1"
"08/01/2020 15:55:57"	"H7094"	"Elder's Assassin Hood"	"0"	"2"	"1"
"08/01/2020 15:55:57"	"Cepas"	"Master's Mercenary Hood"	"1"	"2"	"-1"
"08/01/2020 15:55:57"	"Cepas"	"Elder's Mercenary Hood"	"0"	"3"	"-3"
"08/01/2020 15:55:57"	"H7094"	"Grandmaster's Assassin Hood"	"1"	"3"	"1"
"08/01/2020 15:55:57"	"H7094"	"Master's Mercenary Hood"	"1"	"2"	"1"
"08/01/2020 15:55:57"	"Cepas"	"Grandmaster's Mercenary Hood"	"1"	"4"	"-1"
"08/01/2020 15:55:56"	"H7094"	"Elder's Mercenary Hood"	"0"	"3"	"3"
"08/01/2020 15:55:56"	"Cepas"	"Master's Assassin Hood"	"2"	"4"	"-1"
"08/01/2020 15:55:56"	"H7094"	"Grandmaster's Mercenary Hood"	"1"	"4"	"1"
"08/01/2020 15:55:56"	"Cepas"	"Master's Specter Hood"	"1"	"1"	"-1"
"08/01/2020 15:55:55"	"H7094"	"Master's Assassin Hood"	"2"	"4"	"1"
"08/01/2020 15:55:55"	"Cepas"	"Expert's Judicator Helmet"	"3"	"2"	"-1"
"08/01/2020 15:55:55"	"H7094"	"Master's Specter Hood"	"1"	"1"	"1"
"08/01/2020 15:55:55"	"Cepas"	"Adept's Judicator Helmet"	"2"	"2"	"-1"
"08/01/2020 15:55:55"	"H7094"	"Master's Specter Hood"	"1"	"2"	"1"
"08/01/2020 15:55:55"	"H7094"	"Expert's Judicator Helmet"	"3"	"2"	"1"
"08/01/2020 15:55:54"	"H7094"	"Adept's Judicator Helmet"	"2"	"2"	"1"
"08/01/2020 15:55:53"	"Cepas"	"Grandmaster's Knight Helmet"	"0"	"4"	"-1"
"08/01/2020 15:55:53"	"Cepas"	"Master's Soldier Helmet"	"1"	"2"	"-1"
"08/01/2020 15:55:53"	"H7094"	"Grandmaster's Knight Helmet"	"0"	"4"	"1"
"08/01/2020 15:55:52"	"Cepas"	"Grandmaster's Knight Helmet"	"1"	"2"	"-9"
"08/01/2020 15:55:52"	"Cepas"	"Elder's Knight Helmet"	"1"	"3"	"-2"
"08/01/2020 15:55:52"	"Cepas"	"Elder's Knight Helmet"	"0"	"4"	"-2"
"08/01/2020 15:55:52"	"H7094"	"Master's Soldier Helmet"	"1"	"2"	"1"
"08/01/2020 15:55:50"	"H7094"	"Grandmaster's Knight Helmet"	"1"	"2"	"9"
"08/01/2020 15:55:50"	"Cepas"	"Elder's Knight Helmet"	"0"	"2"	"-6"
"08/01/2020 15:55:50"	"H7094"	"Elder's Knight Helmet"	"0"	"4"	"2"
"08/01/2020 15:55:49"	"H7094"	"Elder's Knight Helmet"	"1"	"3"	"2"
"08/01/2020 15:55:49"	"Cepas"	"Elder's Knight Helmet"	"0"	"3"	"-5"
"08/01/2020 15:55:49"	"Cepas"	"Grandmaster's Druid Robe"	"0"	"3"	"-1"
"08/01/2020 15:55:49"	"Cepas"	"Grandmaster's Knight Helmet"	"0"	"2"	"-2"
"08/01/2020 15:55:49"	"H7094"	"Elder's Knight Helmet"	"0"	"2"	"6"
"08/01/2020 15:55:48"	"Cepas"	"Grandmaster's Knight Helmet"	"1"	"3"	"-3"
"08/01/2020 15:55:48"	"H7094"	"Grandmaster's Knight Helmet"	"0"	"2"	"2"
"08/01/2020 15:55:48"	"Cepas"	"Elder's Knight Helmet"	"0"	"1"	"-1"
"08/01/2020 15:55:48"	"H7094"	"Grandmaster's Knight Helmet"	"1"	"3"	"3"
"08/01/2020 15:55:48"	"Cepas"	"Elder's Knight Helmet"	"1"	"2"	"-2"

*/

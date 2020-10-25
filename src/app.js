import React, { PureComponent } from 'react';
import Side from './component/side';
import Items from './component/items';

export default class App extends PureComponent {
    constructor() {
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
            tiers: ['t4', 't5', 't6', 't7', 't8', 'extra'].reduce((acc, v) => { acc[v] = true; return acc }, {}),
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
        const extra = keys.reduce((acc, v) => { acc.push(patterns[v]); return acc; }, []);
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
        console.log({ players, playerCriteria });
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

                let deposited = (_player && _player[item]) || 0

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

import { filter } from './filtering/engine';

export const onFilter = (data, pattern) => {
    pattern = (pattern || '').toLowerCase();

    for (const v of data) {
        v.isExpanded = filter(v, pattern);

        if (!pattern) {
            v.isExpanded = false;
            v.isVisible = true;
        }
    }
};

export const onExpand = (data, path) => {
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


export const extract = (v) => v.slice(1, v.length - 1);
export const parseChestLog = (v) => {
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
export const buildRecord = (v, index) => ({
    player: v[3],
    guild: v[2],
    alliance: v[1],

    item: v[4],
    label: v[5].replace(`${v[4]} - `, ''),
    amount: v[7],
    timestamp: v[0],
});


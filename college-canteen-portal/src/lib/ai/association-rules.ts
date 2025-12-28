import { prisma } from '../prisma';

interface Rule {
    antecedent: string[]; // Items bought
    consequent: string;   // Recommended item
    confidence: number;
}

export async function trainAssociationRules(vendorId?: string) {
    // 1. Fetch completed orders
    const orders = await prisma.order.findMany({
        where: {
            status: 'COMPLETED',
            vendorId: vendorId || undefined,
        },
        include: {
            items: true
        },
        take: 1000, // Limit for performance in MVP
    });

    const transactions = orders.map(o => o.items.map(i => i.menuItemId));
    // Filter out single-item transactions as they don't form pairs
    const validTransactions = transactions.filter(t => t.length > 1);

    const itemCounts: Record<string, number> = {};
    const pairCounts: Record<string, number> = {};

    // 2. Count Frequencies
    validTransactions.forEach((tx: string[]) => {
        // Count individual items
        tx.forEach((item: string) => {
            itemCounts[item] = (itemCounts[item] || 0) + 1;
        });

        // Count pairs (Simple Apriori)
        for (let i = 0; i < tx.length; i++) {
            for (let j = i + 1; j < tx.length; j++) {
                // Sort to ensure A-B is same as B-A for counting
                const pair = [tx[i], tx[j]].sort().join(',');
                pairCounts[pair] = (pairCounts[pair] || 0) + 1;
            }
        }
    });

    // 3. Generate Rules
    const rules: Rule[] = [];
    Object.entries(pairCounts).forEach(([pairKey, pairFreq]) => {
        const [itemA, itemB] = pairKey.split(',');
        const freqA = itemCounts[itemA];
        const freqB = itemCounts[itemB];

        // Rule: Buy A -> Buy B
        const confAtoB = pairFreq / freqA;
        if (confAtoB > 0.3) { // Min confidence threshold
            rules.push({ antecedent: [itemA], consequent: itemB, confidence: confAtoB });
        }

        // Rule: Buy B -> Buy A
        const confBtoA = pairFreq / freqB;
        if (confBtoA > 0.3) {
            rules.push({ antecedent: [itemB], consequent: itemA, confidence: confBtoA });
        }
    });

    // 4. Sort by confidence
    rules.sort((a, b) => b.confidence - a.confidence);

    return rules;
}

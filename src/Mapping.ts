export function mapSolution<Item, Domain>(solution: Map<string, Domain>, idProvider: IdRoundTrip<Item>): [Item, Domain][] {
    return Array.from(solution.entries()).map(e => [idProvider.fromId(e[0]), e[1]])
}

export interface IdRoundTrip<Item> {
    toId(item: Item): string
    fromId(id: string): Item
}

export const identityIdRoundTrip: IdRoundTrip<string> = {
    toId(item: string): string {return item},
    fromId(id: string): string {return id}
}

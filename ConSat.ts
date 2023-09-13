export interface Constraint<Item, Domain> {
    satisfiedBy(candidate: [Item, Domain][]):boolean
}

/***
 * Represents a predicate that can test whether a candidate solution is acceptable.
 * The candidate solution may be incomplete and the predicate should return false if any of the value
 * assignments breach its rule and true otherwise. The canTest parameter provides a short-cut to detect whether a
 * partial candidate solution can be tested by this predicate, the solution may not yet have set the fields that this
 * predicate is interested in and so unsing this can avoid needin complex guard logic in the actual predicate.
 ***/
export class PredicateConstraint<Item, Domain> implements Constraint<Item, Domain> {
    private readonly name: string = ''
    private readonly test: (candidate:[Item, Domain][])=>boolean

    constructor(name:string, predicate: (candidate:[Item, Domain][])=>boolean, canTest: (candidate:[Item, Domain][])=>boolean = c => true) {
        this.name = name
        this.test = c => !canTest(c) || predicate(c)
    }

    satisfiedBy(candidate: [Item, Domain][]):boolean {
        const result = this.test(candidate);
        return result
    }
}

export class EveryConstraint<Item, Domain> implements Constraint<Item, Domain> {
    private readonly name: string = ''
    private readonly test: (candidate:[Item, Domain])=>boolean

    constructor(name:string, predicate: (item:[Item, Domain])=>boolean) {
        this.name = name
        this.test = c => predicate(c)
    }

    satisfiedBy(candidate: [Item, Domain][]):boolean {
        return candidate.every(c => this.test(c))
    }
}

export class ConstraintSet<Item, Domain> implements Constraint<Item, Domain>{
    private __constraints : Constraint<Item, Domain>[]

    constructor(constraints: Constraint<Item, Domain>[]) {
        this.__constraints = constraints
    }
    satisfiedBy(candidate: [Item, Domain][]): boolean {
        return this.__constraints.every(c => c.satisfiedBy(candidate))
    }
}

export const NO_CONSTRAINT = new ConstraintSet([])

type None = 'NONE'
type Maybe<T> = T | None

function mapSolution<Item, Domain>(solution: Map<string, Domain>, idProvider: IdRoundTrip<Item>): [Item, Domain][] {
    return Array.from(solution.entries()).map(e => [idProvider.fromId(e[0]), e[1]])
}

function backtrackInner<Item, Domain>(unboundVariables: [Item, Iterable<Domain>][], currentSolution:Map<string, Domain>, constraint:Constraint<Item, Domain>, idProvider: IdRoundTrip<Item>): Maybe<[Item, Domain][]> {
    if (!constraint.satisfiedBy(mapSolution(currentSolution, idProvider))) {
      return "NONE"
    }

    if (unboundVariables.length <= 0) {
        return mapSolution(currentSolution, idProvider)
    } else {
        for (const variable of unboundVariables) {
            const item:Item = variable[0]
            const candidates: Iterable<Domain> = variable[1]
            for (const candidate of candidates) {
                const newSolution = new Map(currentSolution)
                newSolution.set(idProvider.toId(item), candidate)
                const newUnboundVariables = unboundVariables.filter((v) => idProvider.toId(v[0]) !== idProvider.toId(item))

                const res = backtrackInner(Array.from(newUnboundVariables), newSolution, constraint, idProvider)
                if (res !== 'NONE') {
                    return res
                }
            }
        }
        return "NONE"
    }
}

export interface IdRoundTrip<Item> {
    toId(item: Item): string
    fromId(id: string): Item
}

export const identityIdRoundTrip: IdRoundTrip<string> = {
    toId(item: string): string {return item},
    fromId(id: string): string {return id}
}

export function backtrack<Item, Domain>(variables: [Item, Iterable<Domain>][], constraints: Constraint<Item, Domain>, idProvider: IdRoundTrip<Item>): [Item, Domain][][] {
    const result : Maybe<[Item, Domain][]> = backtrackInner(variables, new Map(), constraints, idProvider)
    if (result === 'NONE') {
        return []
    } else {
        return [result]
    }
}

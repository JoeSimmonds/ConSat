

export interface Constraint<Item, Domain> {
    satisfiedBy(candidate: [Item, Domain][]):boolean
}

export class ConstraintSet<Item, Domain> implements Constraint<Item, Domain> {
    private __constraints: Constraint<Item, Domain>[]

    constructor(constraints: Constraint<Item, Domain>[]) {
        this.__constraints = constraints
    }
    
    concat(that: ConstraintSet<Item, Domain >) : ConstraintSet<Item, Domain> {
        return new ConstraintSet<Item, Domain>(this.__constraints.concat(that.__constraints))
    }

    satisfiedBy(candidate: [Item, Domain][]): boolean {
        return this.__constraints.every(c => c.satisfiedBy(candidate))
    }
}

export const NO_CONSTRAINT = new ConstraintSet([])

export class PredicateConstraint<Item, Domain> implements Constraint<Item, Domain> {
    private readonly name: string = ''
    private readonly test: (candidate: [Item, Domain][]) => boolean

    constructor(name: string, predicate: (candidate: [Item, Domain][]) => boolean, shouldTest: (candidate: [Item, Domain][]) => boolean = c => true) {
        this.name = name
        this.test = c => !shouldTest(c) || predicate(c)
    }

    satisfiedBy(candidate: [Item, Domain][]): boolean {
        const result = this.test(candidate);
        return result
    }
}

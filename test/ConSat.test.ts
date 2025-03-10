import {backtrack} from "../src/Backtracking.js";
import {NO_CONSTRAINT, PredicateConstraint} from "../src/Constraints.js";
import {identityIdRoundTrip} from "../src/Mapping.js";
import {DevNullReporter} from "../src/Reporting.js";

expect.extend({
    toBeIn<T>(received:T, collection:Container<T>) {
        if (collection.includes(received)) {
            return {
                pass: true,
                message() {return `The collection ${collection} contained ${received}`}
            }
        } else {
            return {
                pass: false,
                message() {return `The collection ${collection} did not contain ${received}`}
            }
        }

    }
})


interface Container<T> {
    includes(item:T):boolean
}

interface CustomMatchers<R = unknown> {
    toNeverBeRight(): R
    toBeIn<E>(collection: Container<E>): R
}

declare global {
    namespace jest {
        interface Matchers<R, T> extends CustomMatchers<R> {}
    }
}


test("binds a result to a value from the domain", async () => {
    const domain = [1,6,7,12]

    const variables: [string, Iterable<number>][] = [["blah", domain]]


    const results: [string, number][][] = await backtrack<string, number>(variables, NO_CONSTRAINT, identityIdRoundTrip,  new DevNullReporter())

    expect(results.length).toBeGreaterThan(0)
    for (const resultSet of results) {
        const r = new Map(resultSet)
        const x  =  r.get('blah')
        expect(x).toBeDefined()
        expect(x).toBeIn(domain)
    }
})

test('selects a value that doesn\'t contradict the constraints', async () => {
    const domain:number[] = [1,6,7,12]

    const variables: [string, Iterable<number>][] = [["blah", domain]]

    const results = await backtrack<string, number>(
        variables, new PredicateConstraint<string, number>("blah value must be even",
            (c:[string, number][]) => (new Map(c).get('blah') || 1) % 2 == 0,
            (c: [string, number][]) => new Map(c).has('blah')),
        identityIdRoundTrip,  new DevNullReporter()
    )

    expect(results.length).toBeGreaterThan(0)
    for (const resultSet of results) {
        const r = new Map(resultSet)
        expect(r.get('blah')).toBeIn([6,12])
    }
})

test('All fields are assigned a value', async ()=> {
    const variables: [string, Iterable<number|string>][] = [
        ['foo', [1,5,7,8,12,134]],
        ['bar', ['monday', 'tuesday', 'Wednesday']]
    ]

    const results = await backtrack<string, number|string>(variables, NO_CONSTRAINT, identityIdRoundTrip,  new DevNullReporter())

    expect(results.length).toBeGreaterThan(0)
    for (const resultSet of results) {
        const r = new Map(resultSet)
        expect(r.get('foo')).toBeIn([1,5,7,8,12,134])
        expect(r.get('bar')).toBeIn(['monday', 'tuesday', 'Wednesday'])
    }
})

test('Multiple fields can be checked in a constraint', async ()=> {
    const variables: [string, Iterable<number|string>][] = [
        ['foo', [1,5,7,8,12,134]],
        ['bar', ['monday', 'tuesday', 'Wednesday']]
    ]

    const results = await backtrack<string, number|string>(variables, new PredicateConstraint<string, number|string>(
        "foo must contain the length of bar",
        (c) => new Map(c).get('foo') === (new Map(c).get('bar') as string).length,
        (c) => new Map(c).has('foo') && new Map(c).has('bar')
    ), identityIdRoundTrip,  new DevNullReporter())

    expect(results.length).toBeGreaterThan(0)
    for (const resultSet of results) {
        const r = new Map(resultSet)
        expect(r.get('foo')).toBeIn([1,5,7,8,12,134])
        expect(r.get('bar')).toBeIn(['monday', 'tuesday', 'Wednesday'])
    }
})

test('empty domain returns an empty response indicating no valid solutions', async () =>{
    const domain:number[] = []

    const variables: [string, Iterable<number>][] =  [
        ["blah", []]
    ]

    const results = await backtrack<string, number>(
        variables, NO_CONSTRAINT, identityIdRoundTrip,  new DevNullReporter()
    )

    expect(results.length).toBe(0)
})

test('returns no results if no satisfying combination can be found', async ()=> {
    const variables: [string, Iterable<number|string>][] = [
        ['foo',[1,5,7,12,134]],
        ['bar',['monday', 'thursday', 'Wednesday']]
    ]

    const results = await backtrack<string, number|string>(variables, new PredicateConstraint<string, number|string>(
        "foo must contain the length of bar",
        (c) => new Map(c).get('foo') === (new Map(c).get('bar') as string).length,
        c => new Map(c).has('foo') && new Map(c).has('bar')
     ), identityIdRoundTrip, new DevNullReporter())

    expect(results).toStrictEqual([])
})

test('constraints that reference fields on a partial solution that are not there still pass', () => {
    const OUT = new PredicateConstraint('foo is 12', c => new Map(c).get('foo') === 12, c => new Map(c).has('foo'))
    expect(OUT.satisfiedBy([['bar',34]])).toBe(true)
})



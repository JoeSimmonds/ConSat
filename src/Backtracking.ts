import {Constraint} from "./Constraints.js";
import {ConstraintProgress, Reporter} from "./Reporting.js";
import {IdRoundTrip, mapSolution} from "./Mapping.js";
import {v4 as uuid4} from "uuid"

type Maybe<T> = T | undefined

async function backtrackInner<Item, Domain>(unboundVariables: [Item, Iterable<Domain>][],
                                      currentSolution:Map<string, Domain>,
                                      previousSolutionId: string|undefined,
                                      constraint:Constraint<Item, Domain>,
                                      idProvider: IdRoundTrip<Item>,
                                      progressReporter: Reporter<Item, Domain>): Promise<Maybe<[Item, Domain][]>> {
    const currentSolutionId:string = uuid4()
    const satisfied = constraint.satisfiedBy(mapSolution(currentSolution, idProvider))
    const complete = unboundVariables.length <= 0
    await progressReporter.report(new ConstraintProgress<Item, Domain>(
        unboundVariables.map(x => x[0]),
        mapSolution(currentSolution, idProvider),
        currentSolutionId,
        previousSolutionId,
        satisfied, complete)
    )
    if (!satisfied ) {return undefined}
    if (complete) {return mapSolution(currentSolution, idProvider)}

    for (const variable of unboundVariables) {
        const item:Item = variable[0]
        const candidates: Iterable<Domain> = variable[1]
        for (const candidate of candidates) {
            const newSolution = new Map(currentSolution)
            newSolution.set(idProvider.toId(item), candidate)
            const newUnboundVariables = unboundVariables.filter((v) => idProvider.toId(v[0]) !== idProvider.toId(item))

            const res = await backtrackInner(Array.from(newUnboundVariables), newSolution, currentSolutionId, constraint, idProvider, progressReporter)
            if (res) {
                return res
            }
        }
    }
    return undefined
}

export async function backtrack<Item, Domain>(variables: [Item, Domain[]][], constraints: Constraint<Item, Domain>, idProvider: IdRoundTrip<Item>, reporter: Reporter<Item, Domain> ): Promise<[Item, Domain][][]> {
    const sortedVariables = variables.sort((a, b) => a[1].length - b[1].length)
    await reporter.init()
    const result : Maybe<[Item, Domain][]> = await backtrackInner(sortedVariables, new Map(), undefined, constraints, idProvider, reporter)
    await reporter.cleanup()
    if (!result) {
        return []
    } else {
        return [result]
    }
}

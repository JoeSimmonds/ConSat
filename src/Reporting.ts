import * as os from "os";
import * as mongo from "mongodb"
import {v4 as uuid4} from "uuid"
import {IndexDescription, ObjectId, UUID} from "mongodb";
import Any = jasmine.Any;
export class ConstraintProgress<Item, Domain> {
    public readonly currentSolution: [Item, Domain][];
    private unboundVariables: Item[];
    public readonly isValid: boolean;
    public readonly isComplete: boolean;
    public readonly solutionId: string
    public readonly parentSolutionId: string|undefined;

    constructor(unboundVariables: Item[],
                currentSolution:[Item, Domain][],
                solutionId:string,
                parentSolutionId:string|undefined,
                valid: boolean, complete: boolean) {
        this.unboundVariables = unboundVariables;
        this.currentSolution = currentSolution;
        this.solutionId = solutionId
        this.parentSolutionId = parentSolutionId
        this.isValid = valid
        this.isComplete = complete
    }

    public unboundCount(): number {return this.unboundVariables.length}
    public variablesCount(): number {return this.currentSolution.length + this.unboundCount()}
    public boundCount(): number {return this.currentSolution.length}
}

export interface Reporter<Item, Domain> {
    init():Promise<void>
    report(progress: ConstraintProgress<Item, Domain>): Promise<void>
    cleanup():Promise<void>
}

export class DevNullReporter<Item, Domain> implements Reporter<Item, Domain> {
    init(): Promise<void> {return Promise.resolve()}
    cleanup(): Promise<void> {return Promise.resolve()}
    report(progress: ConstraintProgress<Item, Domain>): Promise<void> {return Promise.resolve();}
}

class BaseConsoleReporter<Item, Domain> {
    private attempts = 0;
    private totalAttempts = 0;

    init(): Promise<void> {return Promise.resolve()}
    cleanup(): Promise<void> {return Promise.resolve()}
    doReport(progress: ConstraintProgress<Item, Domain>) {
        process.stdout.write(`${progress.boundCount()} of ${progress.variablesCount()} bound (${this.attempts} combinations tried, ${this.totalAttempts} in total)`)
        if (progress.isValid) {
            this.attempts = 1
            this.totalAttempts ++
        } else {
            this.attempts ++
            this.totalAttempts ++
        }
    }
}

export class ConsoleReporter<Item, Domain> extends BaseConsoleReporter<Item, Domain> implements Reporter<Item, Domain>{

    report(progress: ConstraintProgress<any, any>): Promise<void> {
        super.doReport(progress)
        process.stdout.write(os.EOL)
        return Promise.resolve()
    }
}

export class InlineConsoleReporter<Item, Domain> extends BaseConsoleReporter<Item, Domain> implements Reporter<Item, Domain> {
    report(progress: ConstraintProgress<Item, Domain>): Promise<void> {
        process.stdout.cursorTo(0)
        process.stdout.clearLine(0)
        super.doReport(progress)
        return Promise.resolve()
    }
}

export class SemiInlineConsoleReporter<Item, Domain> extends InlineConsoleReporter<Item, Domain> implements Reporter<Item, Domain> {
    private lowestUnbound: number|undefined = undefined;

    report(progress: ConstraintProgress<Item, Domain>): Promise<void> {
        if (!this.lowestUnbound || (this.lowestUnbound > progress.unboundCount() && progress.isValid)) {
            this.lowestUnbound = progress.unboundCount()
            if (this.lowestUnbound) console.log("!")
        }
        return super.report(progress)
    }
}

export class MultiReporter<Item, Domain> implements Reporter<Item, Domain> {
    private reporter1: Reporter<Item, Domain>
    private reporter2: Reporter<Item, Domain>

    constructor(reporter1: Reporter<Item, Domain>, reporter2: Reporter<Item, Domain>) {
        this.reporter1 = reporter1;
        this.reporter2 = reporter2;
    }

    init(): Promise<void> {
        return this.reporter1.init()
            .then(this.reporter2.init)
    }
    cleanup(): Promise<void> {
        return this.reporter1.cleanup()
            .then(this.reporter2.cleanup)
    }

    async report(progress: ConstraintProgress<Item, Domain>): Promise<void> {
        await this.reporter1.report(progress)
        await this.reporter2.report(progress)
    }
}

export class MongoReporter<Item, Domain> implements Reporter<Item, Domain> {
    private mongoUri:string
    private client: mongo.MongoClient|undefined = undefined
    private database: mongo.Db|undefined = undefined
    private reportCollection: mongo.Collection|undefined = undefined
    private sequenceNumber:number = 0
    private runId:string|undefined = undefined

    constructor(mongoUri:string) {
        this.mongoUri = mongoUri
    }

    async init(): Promise<void> {
        if (this.client) {
            await this.cleanup()
        }
        this.client = new mongo.MongoClient(this.mongoUri)
        this.database  = this.client.db('sudoku');
        this.reportCollection = this.database.collection('reports')
        this.sequenceNumber = 0
        this.runId = uuid4()

        const expectedIndexes:Array<mongo.IndexDescription> = [
            {key: {runId: 1}},
            {key: {solutionId: 1}}
        ]

        await this.reportCollection.createIndexes(expectedIndexes)

        if (this.runId) {
            const runCollection = this.database.collection('runs')
            const runInfo = {
                runId: new mongo.UUID(this.runId),
                timestamp: new Date()
            }
            await runCollection.insertOne(runInfo)
        }
    }

    async cleanup(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = undefined
            this.database = undefined
            this.reportCollection = undefined
        }
    }

    async report(progress: ConstraintProgress<Item, Domain>): Promise<void> {
        if (this.reportCollection) {
            const data = Object.assign({
                sequence: this.sequenceNumber++,
                runId: new UUID(this.runId)
            }, progress)
            await this.reportCollection.insertOne(data);
        } else {
            throw("Cannot report - Mongo not initialised")
        }

    }
}

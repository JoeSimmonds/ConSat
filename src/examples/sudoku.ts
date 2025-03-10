import * as consat from "../index.js"


type Digit = [1|2|3|4|5|6|7|8|9]
class Coordinate {
    private row: Number
    private column: Number;

    constructor(row: Number, column: Number) {
        this.row = row;
        this.column = column
    }

    asID():string {
        return `${this.row},${this.column}`
    }

    static fromID(id: string): Coordinate {
        const x = id.split(",")
        return new Coordinate(parseInt(x[0]), parseInt(x[1]))
    }

    toString(): string {
        return `${this.row},${this.column}`
    }
}

class IDP implements consat.IdRoundTrip<Coordinate> {
    fromId(id: string): Coordinate {
        return Coordinate.fromID(id);
    }

    toId(item: Coordinate): string {
        return item.asID();
    }

}

function find(coord: Coordinate, board:[Coordinate, number][]): string {
    const i: [Coordinate, Number] | undefined = board.find(x => x[0].asID() === coord.asID())
    if (i) { return `${i[1]}`}
    else {return " "}
}

function fix(coord: Coordinate, board:[Coordinate, number[]][], value: number): [Coordinate, number[]][] {
    const newBoard: [Coordinate, number[]][] =  board.filter(x => x[0].asID() !== coord.asID())
    newBoard.push([coord, [value]])
    return newBoard
}

function display(values: [Coordinate, number][]): void {
    console.log("╔═══╤═══╤═══╗")
    for (let r: number=0; r<9; r++){
        let line:string = "║"
        for (let c:number=0; c<9; c++) {
            line += find(new Coordinate(r, c), values)
            if (c == 2 || c == 5){
                line+="│"
            }
        }
        line += "║"
        console.log(line)
        if (r == 2 || r == 5) {
            console.log("╟───┼───┼───╢")
        }
    }
    console.log("╚═══╧═══╧═══╝")
}

const init = [
    [0,0,6, 0,0,0, 7,5,1],
    [2,0,0, 7,0,0, 0,9,0],
    [0,5,0, 0,0,6, 4,8,0],

    [9,0,2, 0,7,0, 0,0,4],
    [3,7,4, 0,0,0, 8,0,0],
    [1,8,5, 4,2,9, 0,0,7],

    [0,0,1, 9,0,0, 0,7,0],
    [0,0,9, 0,5,0, 1,0,0],
    [0,2,7, 6,0,3, 0,4,5]
]
let problem: [Coordinate, number[]][] = []



for (let row:number = 0; row < 9; row++ ) {
    for (let col:number = 0; col < 9; col++ ) {
        if (init[row][col] === 0) {
            problem.push([new Coordinate(row, col), [1, 2, 3, 4, 5, 6, 7, 8, 9]])
        } else {
            problem.push([new Coordinate(row, col), [init[row][col]]])
        }
    }
}

function noRepeats(coords:Coordinate[]):consat.Constraint<Coordinate, number> {
    return new consat.PredicateConstraint<Coordinate, number>(`ContainsNoRepeats`,
        (candidate:[Coordinate, number][]) => {
            const digits = coords.map((coord:Coordinate) => find(coord, candidate))

            const realDigits: string[] = digits.filter(x => x !== " ")
            return realDigits.every(x => realDigits.filter(a => a === x).length === 1)
        })
}


function boxContainsNoRepeats(x:number, y:number): consat.Constraint<Coordinate, number> {
    return noRepeats([
        new Coordinate(y*3 + 0, x*3 + 0),
        new Coordinate(y*3 + 0, x*3 + 1),
        new Coordinate(y*3 + 0, x*3 + 2),
        new Coordinate(y*3 + 1, x*3 + 0),
        new Coordinate(y*3 + 1, x*3 + 1),
        new Coordinate(y*3 + 1, x*3 + 2),
        new Coordinate(y*3 + 2, x*3 + 0),
        new Coordinate(y*3 + 2, x*3 + 1),
        new Coordinate(y*3 + 2, x*3 + 2)
    ])
}

function rowContainsNoRepeats(row:number):consat.Constraint<Coordinate, number> {
    return noRepeats([0,1,2,3,4,5,6,7,8].map(col => new Coordinate(row, col)))
}

function columnContainsNoRepeats(col:number):consat.Constraint<Coordinate, number> {
    return noRepeats([0,1,2,3,4,5,6,7,8].map(row => new Coordinate(row, col)))
}

const rowColConstraints: consat.Constraint<Coordinate, number>[] = [0,1,2,3,4,5,6,7,8].flatMap(x => [rowContainsNoRepeats(x), columnContainsNoRepeats(x)])
const boxConstraints: consat.Constraint<Coordinate, number>[] = [0,1,2].flatMap(x => [0,1,2].map(y => boxContainsNoRepeats(x, y)))

consat.backtrack<Coordinate, number>(
    problem,
    new consat.ConstraintSet([
        rowColConstraints,
        boxConstraints
    ].flat()),
    new IDP(),
    new consat.MultiReporter(
        new consat.MongoReporter<Coordinate, number>("mongodb://localhost:27017"),
        new consat.InlineConsoleReporter()
    )
).then((x: [Coordinate, number][][]) => display(x[0]))
/// <reference types="@rbxts/testez/globals" />

import { Scribe } from "."

export = (): void => {
    describe("creating a new ScribeRuntime", () => {
        const ScribeRuntime = Scribe.load(`
        actor BEATRIZ "beatriz_id"

        default objective hello "My objective!"

        echo $test

        interact BEATRIZ {
            echo "Interacted with Beatriz!"
        }

        `, {
            test: "Hello, world!"
        })

        it("should not throw when instantiating a new ScribeRuntime.", () => {
            expect(() => Scribe.load("", {})).never.to.throw()
        })

        it("should not throw when retrieving an objective.", () => {
            expect(() => {
                ScribeRuntime.getCurrentObjective()
                ScribeRuntime.getObjective("hello")
            }).never.to.throw()
        })

        it("should interact correctly with the actor", () => {
            expect(() => {
                ScribeRuntime.interact("beatriz_id")
            }).never.to.throw()
        })
    })
}
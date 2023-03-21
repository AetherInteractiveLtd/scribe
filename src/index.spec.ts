/// <reference types="@rbxts/testez/globals" />

import { Scribe } from "."

export = (): void => {
    describe("creating a new ScribeRuntime", () => {
        const ScribeRuntime = Scribe.load(`
            property title "Testing property"

            actor BEATRIZ $testing_id

            store sticks STICKS_COLLECTED 0

            default objective first_objective "Default description"
            objective some_objective "Some other description"

            scene MY_SCENE {
                [BEATRIZ] "Dialog" (2s, "Hello, world!") with {
                    option "Some other dialog text" {
                        echo "All done!"

                        start some_objective
                    }
                }
            }

            interact BEATRIZ {
                echo $test

                # Starting off the scene
                start MY_SCENE
            }

        `, {
            test: "Hello, world!",
            testing_id: "BEATRIZ_ID"
        })

        it("should not throw when instantiating a new ScribeRuntime.", () => {
            expect(() => Scribe.load("", {})).never.to.throw()
        })

        it("should interact correctly with one actor", () => {})
    })
}
/// <reference types="@rbxts/testez/globals" />

import { Scribe, StatusInterpretationCode } from "."

export = (): void => {
    describe("creating a new ScribeRuntime", () => {
        const Beatriz_Id = "BEATRIZ_ID"
        const ScribeRuntime = Scribe.load(`
            property title "Testing property"

            actor BEATRIZ $testing_id

            store sticks STICKS_COLLECTED 0
            store isFinished FLAG false

            default objective first_objective "Default description"
            objective some_objective "Some other description"

            scene MY_SCENE {
                [BEATRIZ] "Testing dialogs." (2s, "Hello, world!") with {
                    option "Option's dialog text." {
                        echo "Stepped on the first option correctly!"

                        set sticks (sticks + 1)

                        start some_objective
                        
                        exit 1
                    }
                }

                if {
                    true == true -> {
                        # Output correctly
                        echo "If statement condition passed correctly."
                    }
                }
            }
            
            scene API_SCENE {
                echo "Correctly played API scene."
            }

            interact BEATRIZ {
                echo $test

                # Starting off the scene
                start MY_SCENE
            }

            trigger sticks {
                echo "Stick's value changed!"
            }

            do {
                # Simple do statement, testing the syntax
            }

        `, {
            test: "Hello, world!",
            testing_id: Beatriz_Id
        })

        it("should not throw when instantiating a new ScribeRuntime.", () => {
            expect(() => Scribe.load("", {})).never.to.throw()
        })

        it("should correctly bind the given callbacks", () => {
            ScribeRuntime.onDialog = ({ characterIdentifier, step }) => {
                expect(characterIdentifier).to.be.equal("BEATRIZ")

                step(1)
            }

            ScribeRuntime.onChange = ({ data }) => {
                expect(data).to.be.equal(1)
            }

            ScribeRuntime.onObjectiveChange = ({ id }) => {
                expect(id).to.be.equal("some_objective")
            }

            ScribeRuntime.onExit = ({ output }) => {
                expect(output).to.be.equal(1) // Correct exit of the program
            }
        })

        it("should start/initialize the runtime correctly", () => {
            expect(ScribeRuntime.start()).to.be.equal(StatusInterpretationCode.OK)
        })

        it("should verify properties correct declaration", () => {
            expect(ScribeRuntime.getProperties().title).to.be.ok()
        })

        it("should interact correctly with one actor", () => {
            expect(() => ScribeRuntime.interact(Beatriz_Id)).never.to.throw()
        })

        it("should check for the current objective", () => {
            expect(ScribeRuntime.getCurrentObjective()?.id).to.be.equal(2) // The second objective
        })

        it("should play a scene correctly", () => {
            expect(() => ScribeRuntime.play("API_SCENE")).never.to.throw()
        })

        it("should change a store's value correctly", () => {
            expect(() => ScribeRuntime.setStore("FLAG", true))
        })
    })
}
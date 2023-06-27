/// <reference types="@rbxts/testez/globals" />

import { Scribe, StatusInterpretationCode } from "."

export = (): void => {
    describe("the build a Scribe runtime", () => {
        it("should build correctly", () => {
            const ScribeRuntime = Scribe.load(`
                $echo("Hello, world!") # This should output at first.
            `, {})

            const statusCode = ScribeRuntime.start()

            expect(statusCode).to.be.equal(StatusInterpretationCode.OK)
        })

        it("should declare/start scenes correctly", () => {
            const ScribeRuntime = Scribe.load(`
                scene FIRST_SCENE {
                    $echo("First scene was ran correctly!")
                }
                
                do {
                    start FIRST_SCENE
                }
            `, {})

            expect((): void => void ScribeRuntime.start()).to.never.throw()
        })

        it("should declare & interact with interactions correctly", () => {
            const ScribeRuntime = Scribe.load(`
                actor TESTING_ACTOR "SiriusLatte" # Easter egg I guess?

                scene MY_SCENE {
                    $echo("Scene correctly started from interaction.")
                }

                interact TESTING_ACTOR {
                    start MY_SCENE
                }
            `, {})

            const statusCode = ScribeRuntime.start()
            if (statusCode !== StatusInterpretationCode.OK) throw `Execution failed before interacting with any actors.`

            expect(() => ScribeRuntime.interact("SiriusLatte")).to.never.throw()
        })

        it("should handle dialogs correctly", () => {
            const ScribeRuntime = Scribe.load(`
                actor ACTOR 0

                scene SCENE {
                    [ACTOR] "Hello there!" (5s) with {
                        option "Hello, how are you?" {
                            [ACTOR] "I'm fine, thank you." (5s)
                        }
                    }
                }

                interact ACTOR {
                    start SCENE
                }
            `, {})

            expect(
                () => {
                    ScribeRuntime.onDialog = ({characterIdentifier, options}, step): void => {
                        print(`Actor triggering this dialog: ${characterIdentifier}. Options: ${options}`)

                        if (options.size() > 0) {
                            step()
                        }
                    }

                    ScribeRuntime.start()
                }
            ).to.never.throw()
        })

        it("should trigger an store (from Scribe & API)", () => {
            const ScribeRuntime = Scribe.load(`
                store id LINKING_ID 0
                store isApiCall API false

                actor ACTOR 0

                trigger [id] {
                    $echo($format("Store was modified correctly. {}", isApiCall -> "Modified from the API." : "Modified from Scribe."))
                }

                interact ACTOR {
                    set id 1
                }
            `, {})

            expect(
                () => {
                    ScribeRuntime.onChange = ({ identifier, newValue, oldValue }): void => {
                        print(`Store changed: ${identifier}. Latest value: ${newValue}. Last value registered: ${oldValue}`)
                    }

                    ScribeRuntime.start()
                    
                    {
                        ScribeRuntime.setStore("isApiCall", true)
                        ScribeRuntime.setStore("id", 10)
                    }
                }
            ).to.never.throw()
        })

        it("should test control statements correctly", () => {
            const ScribeRuntime = Scribe.load(`
                store _0 _ true
                store _1 _ _0 -> "This message should be given." : "This won't be shown."

                if {
                    _0 -> {
                        $echo(_1)

                        set _0 false
                    }

                    otherwise -> {
                        $echo("This won't be ran!")
                    }
                }

                do {
                    if (_0) {
                        $echo ("This won't be shown.")
                    } else {
                        $echo($format("Seemes like variable _0 has changed it's value to {}", _0))
                    }
                }
            `, {})

            expect((): void => void ScribeRuntime.start()).to.never.throw()
        })
    })

    describe("a quest", () => {
        const ScribeRuntime = Scribe.load(`
            property title $format("Gather sticks for {}", $actor)
            
            store isFrend ACTOR_TRACK false

            actor SIRIUS $actor
            actor FRIEND "frend"

            default objective TALK_TO_SIRIUS "The man isn't that scary! C'mon, go talk to him."
            objective RUN "HE BITES, I WAS WRONG, JUST RUN!"
            objective DONE "Oh, I didn't know he was chill like that."

            scene TALKING_TO {
                [SIRIUS] "Hey there! Nice to meet you." (5s) with {
                    option "Nice to meet you too! Who are you by the way?" {
                        [SIRIUS] "I'm SiriusLatte, the creator of Scribe (and MkScribe). I'm here to GATHER your SOUL." with {
                            option "Uh... Could you repeat that last part...?" {
                                [SIRIUS] "Sure! I said, I'M HERE TO GATHER YOUR SOUL!" (5s)

                                start RUN
                            }
                        }
                    }

                    option "Huh, such a random dude." {
                        [SIRIUS] "You know what? I didn't even wanted to talk with someone like you."
                    }
                }
            }

            scene RUNNING {
                if (isFrend) {
                    [FRIEND] "DUDE, DON'T LOOK BACK, JUST KEEP RUNNING!" (15s)
                    [FRIEND] "Okey... I think we lost him. Do you see it?" with {
                        option "It's right behind you..." {
                            [FRIEND] "NOOOOO, RUN, I'M DONE!" (5s)
                        }
                    }
                } else {
                    [SIRIUS] "HAHAHAHAHA, YOU CAN RUN, BUT I'LL CATCH YOU ANYWAY! IT'S USELESS, STOP RIGHT NOW!" (10s) with {
                        option "GO AWAY DUDE!" {
                            [SIRIUS] "Oh okey, sure thing bud" (5s)

                            start DONE
                        }
                    }
                }
            }

            interact SIRIUS {
                if {
                    TALK_TO_SIRIUS -> { start TALKING_TO }

                    otherwise -> { start RUNNING }
                }
            }

            interact FRIEND {
                if {
                    RUN -> { start RUNNING }

                    DONE -> { $echo("I didn't know he was chill like that, lets leave now.") }
                }
            }
        `, {
            actor: "SiriusLatte"
        })

        it("should start quest correctly", () => {
            ScribeRuntime.onDialog = (): void => {}
            ScribeRuntime.onChange = (): void => {}

            ScribeRuntime.onEndExecution = (): void => {
                print("Describing quest has been finished correctly.")
            }

            expect((): void => void ScribeRuntime.start()).to.never.throw()
        })
    })
}
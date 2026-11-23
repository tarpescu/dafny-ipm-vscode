/*
 * Example 1: Product of Consecutive Integers
 *
 * lemma {:isolate_assertions} example1(x : int)
 *  ensures {:ipm} x * (x + 1) % 2 == 0
 * {
 
 * }
 *
 * This example appears on page 2 of the paper.
 * It demonstrates that the product of two consecutive integers is always even.
 *
 * To start the interactive mode, we use the {:ipm} annotation in the .dfy file.
 *
 * Command to run interactive mode:
 *   python /home/dafny-ipm/workdir/dafny-ipm.py /home/dafny-ipm/workdir/examples/example1.dfy
 *
 * Instructions for solving this example:
 *
 * Initial state:
 *   1 goal(s) remaining
 *   
 *   current goal:
 *   hypotheses
 *   goal
 *      (((x * (x + 1)) % 2) == 0)
 *   Solver check status: unknown
 *   Current goal not yet proved.
 * Step 1: case(x%2==0)
 * This command will display:
 *   2 goal(s) remaining
 *   current goal:
 *   hypotheses
 *      (0 == (x % 2))
 *   goal
 *      (((x * (x + 1)) % 2) == 0)
 *   Goal 2: (((x * (x + 1)) % 2) == 0)
 *   Solver check status: unknown
 *   Current goal not yet proved.
 *
 * Step 2: assert x * (x + 1) == 2 * (x / 2 * (x + 1))
 * This command will display:
 *   3 goal(s) remaining
 *   current goal:
 *   hypotheses
 *      (0 == (x % 2))
 *   goal
 *      ((x * (x + 1)) == (2 * ((x / 2) * (x + 1))))
 *   Goal 2: (((x * (x + 1)) % 2) == 0)
 *   Goal 3: (((x * (x + 1)) % 2) == 0)
 *   Congrats, current goal proved.
 *   2 goal(s) remaining
 *   current goal:
 *   hypotheses
 *      (0 == (x % 2))
 *      ((x * (x + 1)) == (2 * ((x / 2) * (x + 1))))
 *   goal
 *      (((x * (x + 1)) % 2) == 0)
 *   Goal 2: (((x * (x + 1)) % 2) == 0)
 *   Congrats, current goal proved.
 *   1 goal(s) remaining
 *   current goal:
 *   hypotheses
 *      ¬((0 == (x % 2)))
 *   goal
 *      (((x * (x + 1)) % 2) == 0)
 *
 * Step 3: assert x * (2 * (x / 2) + 2) == 2 * (x * (x / 2 + 1))
 * After this command we will see:
 *   2 goal(s) remaining
 *   current goal:
 *   hypotheses
 *      ¬((0 == (x % 2)))
 *   goal
 *      ((x * ((2 * (x / 2)) + 2)) == (2 * (x * ((x / 2) + 1))))
 *   Goal 2: (((x * (x + 1)) % 2) == 0)
 *   Congrats, current goal proved.
 *   1 goal(s) remaining
 *   current goal:
 *   hypotheses
 *      ¬((0 == (x % 2)))
 *      ((x * ((2 * (x / 2)) + 2)) == (2 * (x * ((x / 2) + 1))))
 *   goal
 *      (((x * (x + 1)) % 2) == 0)
 *   Congrats, current goal proved.
 *
 * Expected output from interactive mode:
 *   Goal: (((x * (x + 1)) % 2) == 0)
 *   Proof:
 *     if ((0 == (x % 2))) {
 *       assert ((x * (x + 1)) == (2 * ((x / 2) * (x + 1))));
 *     } else {
 *       assert ((x * ((2 * (x / 2)) + 2)) == (2 * (x * ((x / 2) + 1))));
 *     }
 */

lemma {:isolate_assertions} example1(x : int)
  ensures {:ipm} x * (x + 1) % 2 == 0
{
  if (x % 2 == 0) {
    assert x * (x + 1) == 2 * ((x / 2) * (x + 1));
  } else {
    assert x * (2 * (x / 2) + 2) == 2 * (x * ((x / 2) + 1));
  }
}

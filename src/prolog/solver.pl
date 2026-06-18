:- dynamic(placed_wall/2).

% This is a brute-force solution. Breaks down if more than one wall is needed.
solve(Walls) :-
    findall(Cell, wallable(Cell), Candidates),
    budget(Budget),
    between(0, Budget, K),
    n_subset(K, Candidates, Walls),
    is_solved(Walls),
    !.

% n_subset(K, List, Subset): Subset is a size-K subset of List, order preserved.
n_subset(0, _, []) :- !.
n_subset(K, [X | Xs], [X | Ys]) :- K > 0, K1 is K - 1, n_subset(K1, Xs, Ys).
n_subset(K, [_ | Xs], Ys) :- K > 0, n_subset(K, Xs, Ys).

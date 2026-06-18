% ===========================================================================
% solve.horse — solver entry point (STUB — replace solve/1 with your algorithm)
%
% Contract with the UI:
%   solve(Walls) must bind Walls to a list of X-Y pairs — the cells to turn
%   into walls. The UI renders them on the board.
%
% Available after `load_map` (the UI calls `load_map, solve(Walls)`):
%   cell(X, Y, Glyph)   every cell        grid_size(W, H)   board size
%   horse(X, Y)         the horse         placed_wall(X, Y) the human's attempt
%
% The full SWI library is available, including CLP(FD):
%   :- use_module(library(clpfd)).
%
% ---------------------------------------------------------------------------
% This stub just fences the horse's four orthogonal grass neighbours — a
% trivial seal that proves the TS <-> Prolog pipe end to end. It ignores the
% budget and tile values entirely. Delete it and write the real thing.
% ---------------------------------------------------------------------------

:- dynamic(placed_wall/2).

solve(Walls) :-
    horse(HX, HY),
    findall(X-Y,
            ( member(DX-DY, [ (-1)-0, 1-0, 0-(-1), 0-1 ]),
              X is HX + DX,
              Y is HY + DY,
              cell(X, Y, '.') ),
            Walls).

% ===========================================================================
% solve.horse — level map ingestion (data only; no solving logic)
%
% A DCG that parses a level's raw map — a newline-separated grid of glyph
% characters — into queryable facts. (0,0) is the top-left; X increases
% rightward, Y downward.
%
%   cell(X, Y, Glyph)   one per grid cell; Glyph is a one-char atom ('.', '~',
%                       'H', 'C', 'S', 'G', '0'..'9')
%   grid_size(W, H)     width and height in cells
%   horse(X, Y)         the horse's cell (if the map has an 'H')
%
% The map is supplied by a `map_codes/1` fact appended after this source:
%   map_codes("~~~~~.~\n~......\n...").
%
% Asserts persist for the remainder of a goal, so one query suffices:
%   ?- load_map, cell(X, Y, '~').
% ===========================================================================

:- set_prolog_flag(double_quotes, codes).

:- dynamic(cell/3).
:- dynamic(grid_size/2).
:- dynamic(horse/2).

% --- The grammar: map codes -> list of cell/3 terms ------------------------
% The newline rule comes first and commits, so the glyph rule only ever sees a
% non-newline code (and char_code/2 then never fails).

map(Cells) --> rows(0, 0, Cells).

rows(_, Y, Cells) -->
    [0'\n], !,
    { Y1 is Y + 1 },
    rows(0, Y1, Cells).
rows(X, Y, [cell(X, Y, Glyph) | Cells]) -->
    [Code], !,
    { char_code(Glyph, Code), X1 is X + 1 },
    rows(X1, Y, Cells).
rows(_, _, []) --> [].

% --- Loading: parse the embedded map and assert the facts ------------------

load_map :-
    retractall(cell(_, _, _)),
    retractall(grid_size(_, _)),
    retractall(horse(_, _)),
    map_codes(Codes),
    phrase(map(Cells), Codes),
    forall(member(Cell, Cells), assertz(Cell)),
    assert_dimensions,
    assert_horse.

assert_dimensions :-
    ( aggregate_all(max(X), cell(X, _, _), MaxX) -> W is MaxX + 1 ; W = 0 ),
    ( aggregate_all(max(Y), cell(_, Y, _), MaxY) -> H is MaxY + 1 ; H = 0 ),
    assertz(grid_size(W, H)).

% The horse glyph is 'H'; succeed quietly if a map happens to have none.
assert_horse :-
    ( cell(X, Y, 'H') -> assertz(horse(X, Y)) ; true ).

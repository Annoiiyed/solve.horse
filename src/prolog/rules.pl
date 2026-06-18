% A cell is passable if it exists, isn't water, and isn't a wall.
open_cell(Walls, X, Y) :-
    cell(X, Y, Glyph),
    Glyph \== '~',
    \+ member(X-Y, Walls).

passable(Walls, X-Y) :- open_cell(Walls, X, Y).

% A cell is wallable if it is grass.
wallable(X-Y) :- cell(X, Y, '.').

% The four orthogonal neighbours of a cell.
adjacent(X-Y, NX-NY) :-
    ( NX is X + 1, NY = Y
    ; NX is X - 1, NY = Y
    ; NX = X, NY is Y + 1
    ; NX = X, NY is Y - 1
    ).

% reachable(Walls, Cells): every cell the horse can reach without crossing a
% wall or water (4-connected flood fill from the horse).
reachable(Walls, Cells) :-
    horse(HX, HY),
    flood(Walls, [HX-HY], [], Cells).

flood(_, [], Visited, Visited).
flood(Walls, [Cell | Queue], Visited, Cells) :-
    ( ( memberchk(Cell, Visited) ; \+ passable(Walls, Cell) )
    ->  flood(Walls, Queue, Visited, Cells)
    ;   findall(Next, ( adjacent(Cell, Next), \+ memberchk(Next, Visited) ), Neighbours),
        append(Neighbours, Queue, Queue1),
        flood(Walls, Queue1, [Cell | Visited], Cells)
    ).

% A cell on the board's outer border — an escape to "outside".
on_border(X-Y) :-
    grid_size(W, H),
    ( X =:= 0 ; Y =:= 0 ; X =:= W - 1 ; Y =:= H - 1 ).

% is_solved(Walls): the horse's reachable region never touches the border, so
% walls and water seal it off from outside.
is_solved(Walls) :-
    reachable(Walls, Cells),
    \+ ( member(Cell, Cells), on_border(Cell) ).

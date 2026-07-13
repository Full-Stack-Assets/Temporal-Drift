"""Shared Hill Valley coordinate helpers for procedural builders and mission placement."""

TOWN_OFFSET_Y = 7600.0


def world_y(local_y):
    return local_y + TOWN_OFFSET_Y


def world_location(local_x, local_y, local_z):
    return (local_x, world_y(local_y), local_z)


def local_from_world(world_x, world_y_coord, world_z):
    return (world_x, world_y_coord - TOWN_OFFSET_Y, world_z)
